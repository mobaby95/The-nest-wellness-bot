require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes
} = require("discord.js");

const commands = require("./commands");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);


// ========================================
// TEMPORARY DATA STORAGE
// ========================================

const users = {};

function getUser(userId, username) {

  if (!users[userId]) {

    users[userId] = {
      username: username,
      points: 0,
      water: 0,
      steps: 0,
      workoutMinutes: 0,
      sleep: 0,
      selfcare: 0,
      checkins: 0,
      streak: 0,
      badges: []
    };

  }

  users[userId].username = username;

  return users[userId];
}


// ========================================
// BOT STARTUP
// ========================================

client.once("ready", async () => {

  console.log(`${client.user.tag} is online!`);

  try {

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      {
        body: commands
      }
    );

    console.log("Slash commands registered!");

  } catch (error) {

    console.error(error);

  }

});


// ========================================
// COMMANDS
// ========================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;


  const user = getUser(
    interaction.user.id,
    interaction.user.username
  );


  // ========================================
  // 🪺 CHECK-IN
  // ========================================

  if (interaction.commandName === "checkin") {

    const response =
      interaction.options.getString("response");

    user.checkins++;
    user.points += 10;
    user.streak++;

    await interaction.reply({

      content:
`🪺 **NEST CHECK-IN**

Thank you for checking in, **${interaction.user.username}**.

> ${response}

🦉 Your check-in has been recorded.

**+10 Nest Points**

🌿 Remember: you don't have to have a perfect day to make progress.

💚 Take care of yourself today.`,

      ephemeral: true

    });

    return;
  }


  // ========================================
  // 💧 WATER
  // ========================================

  if (interaction.commandName === "water") {

    const glasses =
      interaction.options.getInteger("glasses");

    user.water += glasses;
    user.points += 5;

    await interaction.reply({

      content:
`💧 **HYDRATION HOOT!**

**${interaction.user.username}** just logged **${glasses} glass${glasses === 1 ? "" : "es"} of water!**

🦉 Keep those wings hydrated!

**+5 Nest Points**

🪺 Total logged today: **${user.water} glasses**`,

      ephemeral: false

    });

    return;
  }


  // ========================================
  // 👟 STEPS
  // ========================================

  if (interaction.commandName === "steps") {

    const count =
      interaction.options.getInteger("count");

    user.steps += count;
    user.points += 10;

    await interaction.reply({

      content:
`👟 **MOVEMENT MOMENT!**

**${interaction.user.username}** just logged **${count.toLocaleString()} steps!**

🦉 Every step counts.

**+10 Nest Points**

🌿 Keep moving in whatever way feels good for you.`,

      ephemeral: false

    });

    return;
  }


  // ========================================
  // 🏃 WORKOUT
  // ========================================

  if (interaction.commandName === "workout") {

    const activity =
      interaction.options.getString("activity");

    const minutes =
      interaction.options.getInteger("minutes");

    user.workoutMinutes += minutes;
    user.points += 15;

    await interaction.reply({

      content:
`🏃 **MOVEMENT LOGGED!**

**${interaction.user.username}** completed:

🏃 **${activity}**
⏱️ **${minutes} minutes**

🦉 Nice work!

**+15 Nest Points**

💚 Showing up for yourself counts.`,

      ephemeral: false

    });

    return;
  }


  // ========================================
  // 😴 SLEEP
  // ========================================

  if (interaction.commandName === "sleep") {

    const hours =
      interaction.options.getNumber("hours");

    user.sleep += hours;
    user.points += 5;

    await interaction.reply({

      content:
`😴 **REST LOGGED!**

**${interaction.user.username}** logged **${hours} hours of sleep**.

🌙 Rest is part of wellness, too.

**+5 Nest Points**

🦉 Take care of your mind and body today.`,

      ephemeral: true

    });

    return;
  }


  // ========================================
  // 🌿 SELF-CARE
  // ========================================

  if (interaction.commandName === "selfcare") {

    const activity =
      interaction.options.getString("activity");

    user.selfcare++;
    user.points += 10;

    await interaction.reply({

      content:
`🌿 **SELF-CARE SPOTTED!**

**${interaction.user.username}** made time for themselves today.

🌿 **Activity:** ${activity}

**+10 Nest Points**

🦉 You matter, too.

🪺 Keep making space for yourself.`,

      ephemeral: false

    });

    return;
  }


  // ========================================
  // 📊 PROGRESS
  // ========================================

  if (interaction.commandName === "progress") {

    await interaction.reply({

      content:
`📊 **${interaction.user.username}'S NEST**

🪺 **Wellness Progress**

💧 Water: **${user.water} glasses**
👟 Steps: **${user.steps.toLocaleString()}**
🏃 Movement: **${user.workoutMinutes} minutes**
😴 Sleep logged: **${user.sleep} hours**
🌿 Self-care: **${user.selfcare}**
🪺 Check-ins: **${user.checkins}**

🔥 Streak: **${user.streak} days**
🏆 Nest Points: **${user.points}**

🦉 Keep taking care of yourself!`,

      ephemeral: true

    });

    return;
  }


  // ========================================
  // 🔥 STREAK
  // ========================================

  if (interaction.commandName === "streak") {

    await interaction.reply({

      content:
`🔥 **NEST STREAK**

🦉 **${interaction.user.username}**

🔥 Current streak: **${user.streak} days**

Every day doesn't have to be perfect.

Showing up counts. 🪺`,

      ephemeral: true

    });

    return;
  }


  // ========================================
  // 🏅 BADGES
  // ========================================

  if (interaction.commandName === "badges") {

    const badges = [];

    if (user.checkins >= 1)
      badges.push("🪺 **First Flight**");

    if (user.water >= 7)
      badges.push("💧 **Hydration Hoot**");

    if (user.steps > 0)
      badges.push("👟 **Wandering Owl**");

    if (user.selfcare >= 1)
      badges.push("🌿 **Self-Care Owl**");

    if (user.streak >= 7)
      badges.push("🔥 **Consistent Owl**");

    if (user.sleep > 0)
      badges.push("🌙 **Night Owl**");

    if (user.points >= 500)
      badges.push("🏆 **Nest Champion**");


    const badgeText =
      badges.length > 0
        ? badges.join("\n")
        : "🦉 Your first badge is waiting for you!";


    await interaction.reply({

      content:
`🏅 **${interaction.user.username}'S BADGES**

${badgeText}

🪺 Keep participating to unlock more!`,

      ephemeral: false

    });

    return;
  }


  // ========================================
  // 🏆 LEADERBOARD
  // ========================================

  if (interaction.commandName === "leaderboard") {

    const leaderboard =
      Object.values(users)
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);


    if (leaderboard.length === 0) {

      await interaction.reply(
        "🦉 The leaderboard is waiting for its first Nest members!"
      );

      return;

    }


    const medals = [
      "🥇",
      "🥈",
      "🥉"
    ];


    const ranking =
      leaderboard
        .map((member, index) => {

          const medal =
            medals[index] ||
            `${index + 1}.`;

          return `${medal} **${member.username}** — ${member.points} points`;

        })
        .join("\n");


    await interaction.reply({

      content:
`🏆 **THE NEST LEADERBOARD**

${ranking}

🦉 Keep showing up!
🌿 Every little action counts.

**Use /challenge to see this week's challenge!**`,

      ephemeral: false

    });

    return;
  }


  // ========================================
  // 🎯 CHALLENGE
  // ========================================

  if (interaction.commandName === "challenge") {

    await interaction.reply({

      content:
`🎯 **THIS WEEK'S NEST CHALLENGE**

🦉 **MOVE YOUR WINGS**

Complete **3 movement activities** this week.

Your movement can be anything that works for you:

👟 Walking
🧘 Stretching
💃 Dancing
🏊 Swimming
🏃 Exercise
🌿 Getting outside

**Reward: +25 Nest Points**

There is no competition here.

Just small steps toward taking care of yourself. 🪺💚`,

      ephemeral: false

    });

    return;
  }

});


// ========================================
// LOGIN
// ========================================

client.login(process.env.DISCORD_TOKEN);
