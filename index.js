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

function getBadges(userId) {
  const user = db
    .prepare("SELECT * FROM users WHERE user_id = ?")
    .get(userId);

  return JSON.parse(user.badges || "[]");
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

  const badges = getBadges(userId);

  function award(name) {
    if (!badges.includes(name)) {
      badges.push(name);
    }
  }

  if (user.checkins >= 1) {
    award("🪺 First Flight");
  }

  if (user.water >= 7) {
    award("💧 Hydration Hoot");
  }

  if (user.workouts >= 10) {
    award("👟 Wandering Owl");
  }

  if (user.selfcare >= 10) {
    award("🌿 Self-Care Owl");
  }

  if (user.streak >= 7) {
    award("🔥 Consistent Owl");
  }

  if (user.sleep >= 10) {
    award("🌙 Night Owl");
  }

  if (user.lifetime_points >= 500) {
    award("🏆 Nest Champion");
  }

  saveBadges(userId, badges);

  return badges;
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

      const currentStreak =
        updateCheckinStreak(userId);

      db.prepare(`
        UPDATE users
        SET checkins = checkins + 1
        WHERE user_id = ?
      `).run(userId);

      addPoints(userId, 10);

      updateBadges(userId);

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

      console.log(
        username +
          " completed a wellness check-in."
      );
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

      await interaction.reply({
        content:
          "📊 YOUR NEST PROGRESS\n\n" +
          "🏆 This Week: " +
          currentUser.weekly_points +
          " points\n" +
          "🪺 Lifetime: " +
          currentUser.lifetime_points +
          " points\n" +
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
      const badges = updateBadges(userId);

      await interaction.reply({
        content:
          "🏅 " +
          username +
          "'S NEST BADGES\n\n" +
          (badges.length > 0
            ? badges
                .map((badge) => "• " + badge)
                .join("\n")
            : "🪺 No badges yet — your first flight is waiting!"),
        ephemeral: true,
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
      await interaction.reply(
        "🎯 THIS WEEK'S NEST CHALLENGE\n\n" +
        "🦉 MOVE YOUR WINGS\n\n" +
        "Log movement on 5 different days this week.\n\n" +
        "Complete the challenge and earn 25 Nest Points!"
      );
    }

  } catch (error) {
    console.error("Interaction error:", error);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content:
            "🦉 Something went wrong. Please try again!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content:
            "🦉 Something went wrong. Please try again!",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error(
        "Could not send error response:",
        replyError
      );
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
