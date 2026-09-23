const { SlashCommandBuilder } = require("discord.js");

const commands = [

  new SlashCommandBuilder()
    .setName("checkin")
    .setDescription("Complete your daily wellness check-in.")
    .addStringOption(option =>
      option
        .setName("mood")
        .setDescription("How are you feeling?")
        .setRequired(true)
        .addChoices(
          { name: "😊 Great", value: "great" },
          { name: "🙂 Good", value: "good" },
          { name: "😐 Okay", value: "okay" },
          { name: "😔 Low", value: "low" },
          { name: "😴 Tired", value: "tired" }
        )
    )
    .addStringOption(option =>
      option
        .setName("energy")
        .setDescription("How is your energy?")
        .setRequired(true)
        .addChoices(
          { name: "⚡ High", value: "high" },
          { name: "🌿 Medium", value: "medium" },
          { name: "💤 Low", value: "low" }
        )
    ),

  new SlashCommandBuilder()
    .setName("water")
    .setDescription("Log your water intake.")
    .addIntegerOption(option =>
      option
        .setName("glasses")
        .setDescription("Number of glasses of water")
        .setRequired(true)
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("steps")
    .setDescription("Log your steps.")
    .addIntegerOption(option =>
      option
        .setName("count")
        .setDescription("Number of steps")
        .setRequired(true)
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("workout")
    .setDescription("Log a workout or movement activity.")
    .addStringOption(option =>
      option
        .setName("activity")
        .setDescription("What did you do?")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("How many minutes?")
        .setRequired(true)
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("sleep")
    .setDescription("Log your sleep.")
    .addNumberOption(option =>
      option
        .setName("hours")
        .setDescription("Hours of sleep")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(24)
    ),

  new SlashCommandBuilder()
    .setName("selfcare")
    .setDescription("Log something you did for yourself.")
    .addStringOption(option =>
      option
        .setName("activity")
        .setDescription("What did you do?")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("progress")
    .setDescription("View your wellness progress."),

  new SlashCommandBuilder()
    .setName("streak")
    .setDescription("View your wellness streak."),

  new SlashCommandBuilder()
    .setName("badges")
    .setDescription("View your earned wellness badges."),

  new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("View this week's wellness challenge.")

];

module.exports = commands.map(command => command.toJSON());
