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

client.once("ready", async () => {
  console.log(`🦉 ${client.user.tag} is online!`);

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log("🌿 Slash commands registered!");
});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "water") {

    const glasses =
      interaction.options.getInteger("glasses");

    await interaction.reply({
      content:
        `💧 **${glasses} glass${glasses === 1 ? "" : "es"} logged!**\n\n` +
        `Great job taking care of yourself, Nestling! 🦉🌿`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "steps") {

    const steps =
      interaction.options.getInteger("count");

    await interaction.reply({
      content:
        `🐾 **${steps.toLocaleString()} steps logged!**\n\n` +
        `Every little step counts! 🦉💛`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "workout") {

    const activity =
      interaction.options.getString("activity");

    const minutes =
      interaction.options.getInteger("minutes");

    await interaction.reply({
      content:
        `💪 **Movement logged!**\n\n` +
        `Activity: ${activity}\n` +
        `Time: ${minutes} minutes\n\n` +
        `Way to take care of yourself! 🌿🦉`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "sleep") {

    const hours =
      interaction.options.getNumber("hours");

    await interaction.reply({
      content:
        `🌙 **${hours} hours of sleep logged!**\n\n` +
        `Rest is part of wellness too. 🦉💛`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "selfcare") {

    const activity =
      interaction.options.getString("activity");

    await interaction.reply({
      content:
        `🌸 **Self-care logged!**\n\n` +
        `${activity}\n\n` +
        `You deserve time to take care of yourself. 🦉💛`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "checkin") {

    const mood =
      interaction.options.getString("mood");

    const energy =
      interaction.options.getString("energy");

    await interaction.reply({
      content:
        `🦉 **Daily Check-In Complete!**\n\n` +
        `Mood: ${mood}\n` +
        `Energy: ${energy}\n\n` +
        `Thank you for checking in with yourself today. 🌿`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "progress") {

    await interaction.reply({
      content:
        `🌿 **Your Nest Wellness Progress**\n\n` +
        `Your progress tracker will appear here as we add the database! 🦉`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "streak") {

    await interaction.reply({
      content:
        `🔥 **Wellness Streak**\n\n` +
        `Your streak tracker will appear here soon! 🦉🌿`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "badges") {

    await interaction.reply({
      content:
        `🏅 **The Nest Badges**\n\n` +
        `🌱 Fresh Start\n` +
        `💧 Hydration Hero\n` +
        `🐾 Moving Forward\n` +
        `🌸 Self-Care Star\n` +
        `🔥 Consistency`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "challenge") {

    await interaction.reply({
      content:
        `🪺 **This Week's Nest Challenge**\n\n` +
        `🌿 Complete 3 wellness activities this week.\n\n` +
        `💧 Hydrate\n` +
        `🐾 Move your body\n` +
        `🧘 Stretch\n` +
        `🌸 Practice self-care\n` +
        `🌙 Get some rest\n\n` +
        `Participate at your own pace! 🦉💛`
    });
  }

});

client.login(process.env.DISCORD_TOKEN);
