require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
} = require("discord.js");

const Database = require("better-sqlite3");
const commands = require("./commands");

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is missing.");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("CLIENT_ID is missing.");
  process.exit(1);
}

/* =========================
   DATABASE
========================= */

const databasePath = "/data/nest.db";

let db;

try {
  db = new Database(databasePath);

  db.pragma("journal_mode = WAL");

  console.log("Nest database connected.");
} catch (error) {
  console.error("Could not open database at /data/nest.db.");
  console.error(error);
  process.exit(1);
}
db.prepare(`
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`).run();
/* =========================
   DATABASE TABLE
========================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT DEFAULT 'Nest Member',

    weekly_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,

    checkins INTEGER DEFAULT 0,
    water INTEGER DEFAULT 0,
    steps INTEGER DEFAULT 0,
    workouts INTEGER DEFAULT 0,
    selfcare INTEGER DEFAULT 0,
    sleep INTEGER DEFAULT 0,

    streak INTEGER DEFAULT 0,
    last_checkin_date TEXT,

    badges TEXT DEFAULT '[]',

    week_start TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS nest_challenge (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward INTEGER NOT NULL
  )
`);

const existingChallenge = db
  .prepare("SELECT * FROM nest_challenge WHERE id = 1")
  .get();

if (!existingChallenge) {
  db.prepare(`
    INSERT INTO nest_challenge
    (id, title, description, reward)
    VALUES (1, ?, ?, ?)
  `).run(
    "🦉 MOVE YOUR WINGS",
    "Log movement on 5 different days this week.",
    25
  );
}
/* =========================
   DATE HELPERS
========================= */

function getDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getMonday(date = new Date()) {
  const result = new Date(date);
  const day = result.getUTCDay();

  const difference = day === 0 ? -6 : 1 - day;

  result.setUTCDate(result.getUTCDate() + difference);

  return result;
}

function getWeekStart() {
  return getDateString(getMonday());
}

/* =========================
   USER MANAGEMENT
========================= */

function createUser(userId, username) {
  const weekStart = getWeekStart();

  const statement = db.prepare(`
    INSERT INTO users (
      user_id,
      username,
      weekly_points,
      lifetime_points,
      checkins,
      water,
      steps,
      workouts,
      selfcare,
      sleep,
      streak,
      last_checkin_date,
      badges,
      week_start
    )
    VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, '[]', ?)
  `);

  statement.run(userId, username, weekStart);
}

function getUser(userId, username) {
  let user = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(userId);

  if (!user) {
    createUser(userId, username);

    user = db
      .prepare("SELECT * FROM users WHERE user_id = ?")
      .get(userId);
  }

  if (user.username !== username) {
    db.prepare(`
      UPDATE users
      SET username = ?
      WHERE user_id = ?
    `).run(username, userId);

    user.username = username;
  }

  return user;
}

/* =========================
   WEEKLY RESET
========================= */

function resetWeeklyPointsIfNeeded() {
  const currentWeek = getWeekStart();

  const users = db
    .prepare("SELECT user_id, week_start FROM users")
    .all();

  const reset = db.prepare(`
    UPDATE users
    SET weekly_points = 0,
        week_start = ?
    WHERE user_id = ?
  `);

  for (const user of users) {
    if (user.week_start !== currentWeek) {
      reset.run(currentWeek, user.user_id);
    }
  }
}

/* Run reset when bot starts */
resetWeeklyPointsIfNeeded();

/* =========================
   POINTS
========================= */

function addPoints(userId, amount) {
  db.prepare(`
    UPDATE users
    SET weekly_points = weekly_points + ?,
        lifetime_points = lifetime_points + ?
    WHERE user_id = ?
  `).run(amount, amount, userId);
}

/* =========================
   STREAK
========================= */

function updateCheckinStreak(userId) {
  const user = db
    .prepare(`
      SELECT streak, last_checkin_date
      FROM users
      WHERE user_id = ?
    `)
    .get(userId);

  const today = new Date();
  const todayString = getDateString(today);

  if (user.last_checkin_date === todayString) {
    return user.streak;
  }

  let newStreak = 1;

  if (user.last_checkin_date) {
    const lastDate = new Date(
      user.last_checkin_date + "T00:00:00Z"
    );

    const todayDate = new Date(
      todayString + "T00:00:00Z"
    );

    const difference =
      Math.floor(
        (todayDate - lastDate) /
          (1000 * 60 * 60 * 24)
      );

    if (difference === 1) {
      newStreak = user.streak + 1;
    }
  }

  db.prepare(`
    UPDATE users
    SET streak = ?,
        last_checkin_date = ?
    WHERE user_id = ?
  `).run(newStreak, todayString, userId);

  return newStreak;
}

/* =========================
   BADGES
========================= */

const BADGES = [
  {
    id: "first_flight",
    name: "🪺 First Flight",
    description: "Complete your first wellness check-in.",
    requirement: user => user.checkins >= 1
  },
  {
    id: "tiny_hoot",
    name: "🐣 Tiny Hoot",
    description: "Earn your first 25 lifetime points.",
    requirement: user => user.lifetime_points >= 25
  },
  {
    id: "finding_wings",
    name: "🦉 Finding Your Wings",
    description: "Complete 5 wellness check-ins.",
    requirement: user => user.checkins >= 5
  },
  {
    id: "hydration_hoot",
    name: "💧 Hydration Hoot",
    description: "Log 7 glasses of water.",
    requirement: user => user.water >= 7
  },
  {
    id: "water_bird",
    name: "💦 Water Bird",
    description: "Log 25 glasses of water.",
    requirement: user => user.water >= 25
  },
  {
    id: "wandering_owl",
    name: "👟 Wandering Owl",
    description: "Complete 10 workouts.",
    requirement: user => user.workouts >= 10
  },
  {
    id: "moving_grooving",
    name: "🎶 Moving & Grooving",
    description: "Complete 25 workouts.",
    requirement: user => user.workouts >= 25
  },
  {
    id: "self_care_owl",
    name: "🌿 Self-Care Owl",
    description: "Log 10 self-care activities.",
    requirement: user => user.selfcare >= 10
  },
  {
    id: "little_moments",
    name: "🍃 Little Moments",
    description: "Log 5 self-care activities.",
    requirement: user => user.selfcare >= 5
  },
  {
    id: "night_owl",
    name: "🌙 Night Owl",
    description: "Log 10 sleep entries.",
    requirement: user => user.sleep >= 10
  },
  {
    id: "consistent_owl",
    name: "🔥 Consistent Owl",
    description: "Reach a 7-day check-in streak.",
    requirement: user => user.streak >= 7
  },
  {
    id: "steady_wings",
    name: "🔥 Steady Wings",
    description: "Reach a 14-day check-in streak.",
    requirement: user => user.streak >= 14
  },
  {
    id: "strong_wings",
    name: "🔥 Strong Wings",
    description: "Reach a 30-day check-in streak.",
    requirement: user => user.streak >= 30
  },
  {
    id: "growing_wings",
    name: "🪺 Growing Wings",
    description: "Earn 250 lifetime points.",
    requirement: user => user.lifetime_points >= 250
  },
  {
    id: "nest_champion",
    name: "🏆 Nest Champion",
    description: "Earn 500 lifetime points.",
    requirement: user => user.lifetime_points >= 500
  },
  {
    id: "owl_of_the_nest",
    name: "👑 Owl of the Nest",
    description: "Earn 1,000 lifetime points.",
    requirement: user => user.lifetime_points >= 1000
  }
];

function getBadges(userId) {
  const user = db
    .prepare("SELECT badges FROM users WHERE user_id = ?")
    .get(userId);

  if (!user || !user.badges) {
    return [];
  }

  try {
    return JSON.parse(user.badges);
  } catch {
    return [];
  }
}

function saveBadges(userId, badges) {
  db.prepare(`
    UPDATE users
    SET badges = ?
    WHERE user_id = ?
  `).run(JSON.stringify(badges), userId);
}

function updateBadges(userId) {
  const user = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(userId);

  if (!user) {
    return [];
  }

  const badges = getBadges(userId);
  const newlyEarned = [];

  for (const badge of BADGES) {
    if (
      badge.requirement(user) &&
      !badges.includes(badge.id)
    ) {
      badges.push(badge.id);
      newlyEarned.push(badge);
    }
  }

  saveBadges(userId, badges);

  return newlyEarned;
}
/* =========================
   NEST LEVELS
========================= */

const NEST_LEVELS = [
  {
    name: "🐣 Nestling",
    minPoints: 0
  },
  {
    name: "🪺 Little Owl",
    minPoints: 100
  },
  {
    name: "🦉 Cozy Owl",
    minPoints: 250
  },
  {
    name: "🌿 Wise Owl",
    minPoints: 500
  },
  {
    name: "🪽 Guardian Owl",
    minPoints: 1000
  },
  {
    name: "👑 Elder Owl",
    minPoints: 2000
  }
];

function getNestLevel(lifetimePoints) {
  let currentLevel = NEST_LEVELS[0];

  for (const level of NEST_LEVELS) {
    if (lifetimePoints >= level.minPoints) {
      currentLevel = level;
    }
  }

  return currentLevel;
}

function getNextNestLevel(lifetimePoints) {
  for (const level of NEST_LEVELS) {
    if (lifetimePoints < level.minPoints) {
      return level;
    }
  }

  return null;
}

function getPreviousNestLevel(lifetimePoints) {
  let previousLevel = NEST_LEVELS[0];

  for (const level of NEST_LEVELS) {
    if (lifetimePoints >= level.minPoints) {
      previousLevel = level;
    }
  }

  return previousLevel;
}
/* =========================
   DISCORD CLIENT
========================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

/* =========================
   COMMAND REGISTRATION
========================= */

async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_TOKEN
    );

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      {
        body: commands,
      }
    );

    console.log("Slash commands registered!");
  } catch (error) {
    console.error("Command registration failed:", error);
  }
}

/* =========================
   BOT READY
========================= */

client.once("ready", () => {
  console.log("The Nest Wellness Bot is online!");
  console.log("🦉 NEST LEVEL SYSTEM VERSION 2 IS RUNNING");
  console.log("Logged in as " + client.user.tag);
});

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    resetWeeklyPointsIfNeeded();

    const userId = interaction.user.id;

    const username =
      interaction.user.globalName ||
      interaction.user.username ||
      "Nest Member";

    const user = getUser(userId, username);

    /* =========================
       CHECK-IN
    ========================= */

    if (interaction.commandName === "checkin") {
      const response =
        interaction.options.getString("response");
db.prepare(`
  INSERT INTO checkins
  (user_id, username, response, created_at)
  VALUES (?, ?, ?, ?)
`).run(
  userId,
  username,
  response,
  new Date().toISOString()
);
      const currentStreak =
        updateCheckinStreak(userId);

      db.prepare(`
        UPDATE users
        SET checkins = checkins + 1
        WHERE user_id = ?
      `).run(userId);

      addPoints(userId, 10);

   const newBadges = updateBadges(userId);

      await interaction.reply({
  content:
    "🪺 NEST CHECK-IN\n\n" +
    "Thanks for checking in, " +
    username +
    "!\n\n" +
    "Your check-in has been recorded privately.\n\n" +
    "💫 +10 Nest Points\n" +
    "🔥 Current streak: " +
    currentStreak +
    " day(s)",
  ephemeral: true,
});

if (newBadges.length > 0) {
  await interaction.followUp({
    content:
      "🏅 NEW BADGE UNLOCKED!\n\n" +
      "🦉 " +
      username +
      " just earned:\n\n" +
      newBadges
        .map(badge =>
          badge.name +
          "\n└ " +
          badge.description
        )
        .join("\n\n") +
      "\n\n🦉 Keep spreading those good Nest vibes!",
    ephemeral: false
  });
}

console.log(
  username +
    " completed a wellness check-in."
);
    }
      /* =========================
   JOURNAL
========================= */

else if (interaction.commandName === "journal") {
  const entries = db.prepare(`
    SELECT response, created_at
    FROM checkins
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(userId);

  if (entries.length === 0) {
    await interaction.reply({
      content:
        "📖 YOUR NEST JOURNAL\n\n" +
        "Your journal is empty right now.\n\n" +
        "🪺 Complete a /checkin to add your first entry!",
      ephemeral: true
    });

    return;
  }

  let journalMessage =
    "📖 YOUR NEST JOURNAL\n\n" +
    "Here are your most recent check-ins:\n\n";

  for (const entry of entries) {
    const date = new Date(entry.created_at);

    const formattedDate =
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });

    journalMessage +=
      "🪶 **" + formattedDate + "**\n" +
      entry.response.substring(0, 400) +
      (entry.response.length > 400 ? "..." : "") +
      "\n\n";
  }

  journalMessage +=
    "🔒 This journal is private to you.";

  await interaction.reply({
    content: journalMessage,
    ephemeral: true
  });

  return;
}
    /* =========================
       WATER
    ========================= */

    else if (interaction.commandName === "water") {
      const glasses =
        interaction.options.getInteger("glasses");

      db.prepare(`
        UPDATE users
        SET water = water + ?
        WHERE user_id = ?
      `).run(glasses, userId);

      addPoints(userId, 5);

      updateBadges(userId);

      await interaction.reply(
        "💧 HYDRATION HOOT!\n\n" +
        username +
        " just logged " +
        glasses +
        " glass" +
        (glasses === 1 ? "" : "es") +
        " of water!\n\n" +
        "🦉 +5 Nest Points"
      );
    }

    /* =========================
       STEPS
    ========================= */

    else if (interaction.commandName === "steps") {
      const count =
        interaction.options.getInteger("count");

      db.prepare(`
        UPDATE users
        SET steps = steps + ?
        WHERE user_id = ?
      `).run(count, userId);

      addPoints(userId, 10);

      await interaction.reply(
        "👟 MOVEMENT MOMENT!\n\n" +
        username +
        " just logged " +
        count.toLocaleString() +
        " steps!\n\n" +
        "🦉 +10 Nest Points"
      );
    }

    /* =========================
       WORKOUT
    ========================= */

    else if (interaction.commandName === "workout") {
      const activity =
        interaction.options.getString("activity");

      const minutes =
        interaction.options.getInteger("minutes");

      db.prepare(`
        UPDATE users
        SET workouts = workouts + 1
        WHERE user_id = ?
      `).run(userId);

      addPoints(userId, 15);

      updateBadges(userId);

      await interaction.reply(
        "🏃 MOVEMENT LOGGED!\n\n" +
        username +
        " completed " +
        activity +
        " for " +
        minutes +
        " minutes!\n\n" +
        "🦉 +15 Nest Points"
      );
    }

    /* =========================
       SLEEP
    ========================= */

    else if (interaction.commandName === "sleep") {
      const hours =
        interaction.options.getNumber("hours");

      db.prepare(`
        UPDATE users
        SET sleep = sleep + 1
        WHERE user_id = ?
      `).run(userId);

      addPoints(userId, 5);

      updateBadges(userId);

      await interaction.reply({
        content:
          "😴 SLEEP LOGGED\n\n" +
          "Your " +
          hours +
          "-hour sleep entry was recorded privately.\n\n" +
          "🦉 +5 Nest Points",
        ephemeral: true,
      });
    }

    /* =========================
       SELF CARE
    ========================= */

    else if (interaction.commandName === "selfcare") {
      db.prepare(`
        UPDATE users
        SET selfcare = selfcare + 1
        WHERE user_id = ?
      `).run(userId);

      addPoints(userId, 10);

      updateBadges(userId);

      await interaction.reply(
        "🌿 SELF-CARE SPOTTED!\n\n" +
        username +
        " made time for themselves today!\n\n" +
        "🦉 +10 Nest Points"
      );
    }

    /* =========================
       PROGRESS
    ========================= */

    else if (interaction.commandName === "progress") {
  const currentUser =
    db.prepare(`
      SELECT *
      FROM users
      WHERE user_id = ?
    `).get(userId);

  const currentLevel =
    getNestLevel(currentUser.lifetime_points);

  const nextLevel =
    getNextNestLevel(currentUser.lifetime_points);

  let levelProgress = "";

  if (nextLevel) {
    const pointsNeeded =
      nextLevel.minPoints -
      currentUser.lifetime_points;

    levelProgress =
      "\n✨ Next Level: " +
      nextLevel.name +
      "\n🪶 " +
      pointsNeeded +
      " lifetime points to go";
  } else {
    levelProgress =
      "\n👑 You've reached the highest Nest level!";
  }

  await interaction.reply({
    content:
      "📊 YOUR NEST PROGRESS\n\n" +
      "🦉 Level: " +
      currentLevel.name +
      "\n" +
      "🏆 This Week: " +
      currentUser.weekly_points +
      " points\n" +
      "🪺 Lifetime: " +
      currentUser.lifetime_points +
      " points\n" +
      levelProgress +
      "\n\n" +
      "🔥 Streak: " +
      currentUser.streak +
      " day(s)\n\n" +
      "💬 Check-ins: " +
      currentUser.checkins +
      "\n" +
      "💧 Water logs: " +
      currentUser.water +
      "\n" +
      "👟 Steps: " +
      currentUser.steps.toLocaleString() +
      "\n" +
      "🏃 Workouts: " +
      currentUser.workouts +
      "\n" +
      "😴 Sleep logs: " +
      currentUser.sleep +
      "\n" +
      "🌿 Self-care: " +
      currentUser.selfcare +
      "\n\n" +
      "🪺 Keep taking those little steps!",
    ephemeral: true,
  });
}
    /* =========================
       STREAK
    ========================= */

    else if (interaction.commandName === "streak") {
      const currentUser =
        db.prepare(`
          SELECT streak
          FROM users
          WHERE user_id = ?
        `).get(userId);

      await interaction.reply({
        content:
          "🔥 YOUR NEST STREAK\n\n" +
          "You're currently on a " +
          currentUser.streak +
          "-day streak!\n\n" +
          "Keep taking those little steps. 🦉",
        ephemeral: true,
      });
    }

    /* =========================
       BADGES
    ========================= */

   else if (interaction.commandName === "badges") {
  const userBadges = getBadges(userId);

  const earned = BADGES.filter(badge =>
    userBadges.includes(badge.id)
  );

  const locked = BADGES.filter(badge =>
    !userBadges.includes(badge.id)
  );

  let message =
    "🏅 " +
    username +
    "'S NEST BADGES\n\n";

  message +=
    "✨ EARNED (" +
    earned.length +
    "/" +
    BADGES.length +
    ")\n\n";

  if (earned.length > 0) {
    message += earned
      .map(badge =>
        badge.name +
        "\n└ " +
        badge.description
      )
      .join("\n\n");
  } else {
    message +=
      "🪺 Your first badge is waiting for you!";
  }

  message += "\n\n🔒 LOCKED\n\n";

  if (locked.length > 0) {
    message += locked
      .map(badge =>
        "🔒 " +
        badge.name +
        "\n└ " +
        badge.description
      )
      .join("\n\n");
  }

  await interaction.reply({
    content: message,
    ephemeral: true
  });
}

    /* =========================
       LEADERBOARD
    ========================= */

    else if (interaction.commandName === "leaderboard") {
      const leaderboard =
        db.prepare(`
          SELECT user_id, username, weekly_points
          FROM users
          WHERE weekly_points > 0
          ORDER BY weekly_points DESC
          LIMIT 10
        `).all();

      if (leaderboard.length === 0) {
        await interaction.reply(
          "🏆 THE NEST LEADERBOARD\n\n" +
          "No activity yet this week. " +
          "Be the first owl to earn Nest Points!"
        );

        return;
      }

      const lines = leaderboard.map(
        (entry, index) => {
          return (
            index +
            1 +
            ". " +
            entry.username +
            " — " +
            entry.weekly_points +
            " points"
          );
        }
      );

      await interaction.reply(
        "🏆 THE NEST WEEKLY LEADERBOARD\n\n" +
        "📅 Week of " +
        getWeekStart() +
        "\n\n" +
        lines.join("\n")
      );
    }

    /* =========================
       CHALLENGE
    ========================= */

    else if (interaction.commandName === "challenge") {
  const challenge = db
    .prepare(`
      SELECT title, description, reward
      FROM nest_challenge
      WHERE id = 1
    `)
    .get();

  if (!challenge) {
    await interaction.reply({
      content:
        "🦉 No Nest challenge has been set yet.",
      ephemeral: true
    });

    return;
  }

  await interaction.reply(
    "🎯 THIS WEEK'S NEST CHALLENGE\n\n" +
    challenge.title +
    "\n\n" +
    challenge.description +
    "\n\n" +
    "Complete the challenge and earn " +
    challenge.reward +
    " Nest Points!"
  );
}
      
 /* =========================
       ADMIN — SET CHALLENGE
    ========================= */

    else if (interaction.commandName === "setchallenge") {

      // Make sure only administrators can change the challenge
      if (!interaction.memberPermissions?.has("Administrator")) {
        await interaction.reply({
          content:
            "🦉 Only Nest administrators can change the weekly challenge.",
          ephemeral: true
        });

        return;
      }

      const title =
        interaction.options.getString("title");

      const description =
        interaction.options.getString("description");

      const reward =
        interaction.options.getInteger("reward");

      db.prepare(`
        UPDATE nest_challenge
        SET title = ?, description = ?, reward = ?
        WHERE id = 1
      `).run(
        title,
        description,
        reward
      );

      await interaction.reply({
        content:
          "🎯 NEST CHALLENGE UPDATED!\n\n" +
          title +
          "\n\n" +
          description +
          "\n\n" +
          "🎁 Reward: " +
          reward +
          " Nest Points\n\n" +
          "🦉 The new challenge is now live!",
        ephemeral: true
      });

      console.log(
        "Nest challenge updated by " +
        interaction.user.username
      );
    }

     } catch (error) {
    console.error(
      "Interaction error:",
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          "🦉 Something went wrong in The Nest.",
        ephemeral: true
      });
    }
  }
});
/* =========================
   START BOT
========================= */

(async () => {
  await registerCommands();

  try {
    await client.login(
      process.env.DISCORD_TOKEN
    );
  } catch (error) {
    console.error(
      "Discord login failed:",
      error
    );

    process.exit(1);
  }
})();
