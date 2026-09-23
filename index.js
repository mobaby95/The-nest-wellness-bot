require("dotenv").config();

const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const commands = require("./commands");

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is missing.");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("CLIENT_ID is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const users = {};

function getUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      points: 0,
      checkins: 0,
      water: 0,
      steps: 0,
      workouts: 0,
      selfcare: 0,
      sleep: 0,
      streak: 0,
    };
  }

  return users[userId];
}

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

client.once("ready", () => {
  console.log("The Nest Wellness Bot is online!");
  console.log("Logged in as " + client.user.tag);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  const username =
    interaction.user.globalName ||
    interaction.user.username ||
    "Nest Member";

  const user = getUser(userId);

  try {
    if (interaction.commandName === "checkin") {
      const response = interaction.options.getString("response");

      user.checkins += 1;
      user.points += 10;
      user.streak += 1;

      await interaction.reply({
        content:
          "🪺 NEST CHECK-IN\n\n" +
          "Thanks for checking in, " +
          username +
          "!\n\n" +
          "Your check-in has been recorded privately.\n\n" +
          "💫 +10 Nest Points\n" +
          "🔥 Current streak: " +
          user.streak +
          " day(s)",
        ephemeral: true,
      });

      console.log(
        username +
          " completed a check-in: " +
          response
      );
    }

    else if (interaction.commandName === "water") {
      const glasses = interaction.options.getInteger("glasses");

      user.water += glasses;
      user.points += 5;

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

    else if (interaction.commandName === "steps") {
      const count = interaction.options.getInteger("count");

      user.steps += count;
      user.points += 10;

      await interaction.reply(
        "👟 MOVEMENT MOMENT!\n\n" +
        username +
        " just logged " +
        count.toLocaleString() +
        " steps!\n\n" +
        "🦉 +10 Nest Points"
      );
    }

    else if (interaction.commandName === "workout") {
      const activity = interaction.options.getString("activity");
      const minutes = interaction.options.getInteger("minutes");

      user.workouts += 1;
      user.points += 15;

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

    else if (interaction.commandName === "sleep") {
      const hours = interaction.options.getNumber("hours");

      user.sleep += 1;
      user.points += 5;

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

    else if (interaction.commandName === "selfcare") {
      user.selfcare += 1;
      user.points += 10;

      await interaction.reply(
        "🌿 SELF-CARE SPOTTED!\n\n" +
        username +
        " made time for themselves today!\n\n" +
        "🦉 +10 Nest Points"
      );
    }

    else if (interaction.commandName === "progress") {
      await interaction.reply({
        content:
          "📊 YOUR NEST PROGRESS\n\n" +
          "🪺 Nest Points: " +
          user.points +
          "\n" +
          "💬 Check-ins: " +
          user.checkins +
          "\n" +
          "💧 Water logs: " +
          user.water +
          "\n" +
          "👟 Steps: " +
          user.steps.toLocaleString() +
          "\n" +
          "🏃 Workouts: " +
          user.workouts +
          "\n" +
          "😴 Sleep logs: " +
          user.sleep +
          "\n" +
          "🌿 Self-care: " +
          user.selfcare,
        ephemeral: true,
      });
    }

    else if (interaction.commandName === "streak") {
      await interaction.reply({
        content:
          "🔥 YOUR NEST STREAK\n\n" +
          "You're currently on a " +
          user.streak +
          "-day streak!\n\n" +
          "Keep taking those little steps. 🦉",
        ephemeral: true,
      });
    }

    else if (interaction.commandName === "badges") {
      const badges = [];

      if (user.checkins >= 1) {
        badges.push("🪺 First Flight");
      }

      if (user.water >= 7) {
        badges.push("💧 Hydration Hoot");
      }

      if (user.workouts >= 10) {
        badges.push("👟 Wandering Owl");
      }

      if (user.selfcare >= 10) {
        badges.push("🌿 Self-Care Owl");
      }

      if (user.streak >= 7) {
        badges.push("🔥 Consistent Owl");
      }

      if (user.sleep >= 10) {
        badges.push("🌙 Night Owl");
      }

      if (user.points >= 500) {
        badges.push("🏆 Nest Champion");
      }

      await interaction.reply({
        content:
          "🏅 " +
          username +
          "'S NEST BADGES\n\n" +
          (badges.length > 0
            ? badges.map((badge) => "• " + badge).join("\n")
            : "🪺 No badges yet — your first flight is waiting!"),
        ephemeral: true,
      });
    }

    else if (interaction.commandName === "leaderboard") {
      const leaderboard = Object.entries(users)
        .sort((a, b) => b[1].points - a[1].points)
        .slice(0, 10);

      if (leaderboard.length === 0) {
        await interaction.reply(
          "🏆 THE NEST LEADERBOARD\n\n" +
          "No activity yet. Be the first owl to earn Nest Points!"
        );
        return;
      }

      const lines = leaderboard.map((entry, index) => {
        const memberId = entry[0];
        const data = entry[1];

        const member = interaction.guild
          ? interaction.guild.members.cache.get(memberId)
          : null;

        const name = member
          ? member.displayName
          : "Nest Member";

        return (
          index +
          1 +
          ". " +
          name +
          " — " +
          data.points +
          " points"
        );
      });

      await interaction.reply(
        "🏆 THE NEST LEADERBOARD\n\n" +
        lines.join("\n")
      );
    }

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
          content: "🦉 Something went wrong. Please try again!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "🦉 Something went wrong. Please try again!",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error("Could not send error response:", replyError);
    }
  }
});

(async () => {
  await registerCommands();

  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error("Discord login failed:", error);
    process.exit(1);
  }
})();
