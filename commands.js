const { SlashCommandBuilder } = require("discord.js");

const commands = [

  // 🪺 CHECK-IN
  new SlashCommandBuilder()
    .setName("checkin")
    .setDescription("Share an open-ended wellness check-in")
    .addStringOption(option =>
      option
        .setName("response")
        .setDescription("How are you doing today?")
        .setRequired(true)
    ),

  // 💧 WATER
  new SlashCommandBuilder()
    .setName("water")
    .setDescription("Log your water intake")
    .addIntegerOption(option =>
      option
        .setName("glasses")
        .setDescription("How many glasses of water did you drink?")
        .setMinValue(1)
        .setRequired(true)
    ),

  // 👟 STEPS
  new SlashCommandBuilder()
    .setName("steps")
    .setDescription("Log your steps")
    .addIntegerOption(option =>
      option
        .setName("count")
        .setDescription("How many steps did you take?")
        .setMinValue(1)
        .setRequired(true)
    ),

  // 🏃 WORKOUT
  new SlashCommandBuilder()
    .setName("workout")
    .setDescription("Log movement or exercise")
    .addStringOption(option =>
      option
        .setName("activity")
        .setDescription("What activity did you do?")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("How many minutes?")
        .setMinValue(1)
        .setRequired(true)
    ),

  // 😴 SLEEP
  new SlashCommandBuilder()
    .setName("sleep")
    .setDescription("Log your sleep")
    .addNumberOption(option =>
      option
        .setName("hours")
        .setDescription("How many hours did you sleep?")
        .setMinValue(0)
        .setMaxValue(24)
        .setRequired(true)
    ),

  // 🌿 SELF-CARE
  new SlashCommandBuilder()
    .setName("selfcare")
    .setDescription("Log something you did for yourself")
    .addStringOption(option =>
      option
        .setName("activity")
        .setDescription("What did you do for yourself?")
        .setRequired(true)
    ),

  // 📊 PROGRESS
  new SlashCommandBuilder()
    .setName("progress")
    .setDescription("View your wellness progress"),

  // 🔥 STREAK
  new SlashCommandBuilder()
    .setName("streak")
    .setDescription("View your wellness streak"),

  // 🏅 BADGES
  new SlashCommandBuilder()
    .setName("badges")
    .setDescription("View your Nest wellness badges"),

  // 🎯 CHALLENGE
  new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("View the current Nest wellness challenge")

];

module.exports = commands.map(command => command.toJSON());
