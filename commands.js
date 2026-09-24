const { SlashCommandBuilder } = require("discord.js");

const commands = [

  // 🪺 DAILY CHECK-IN
  new SlashCommandBuilder()
    .setName("checkin")
    .setDescription("Share an open-ended wellness check-in")
    .addStringOption(option =>
      option
        .setName("response")
        .setDescription("How are you doing today?")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
  .setName("journal")
  .setDescription("View your recent private Nest Journal entries."),
  
  // 💧 WATER
  new SlashCommandBuilder()
    .setName("water")
    .setDescription("Log your water intake")
    .addIntegerOption(option =>
      option
        .setName("glasses")
        .setDescription("Number of glasses of water")
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
        .setDescription("Number of steps")
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
        .setDescription("Hours of sleep")
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

  // 📊 PERSONAL PROGRESS
  new SlashCommandBuilder()
    .setName("progress")
    .setDescription("View your personal wellness progress"),

  // 🔥 STREAK
  new SlashCommandBuilder()
    .setName("streak")
    .setDescription("View your Nest streak"),

  // 🏅 BADGES
  new SlashCommandBuilder()
    .setName("badges")
    .setDescription("View your Nest badges"),

  // 🏆 LEADERBOARD
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View The Nest leaderboard"),

  // 🎯 CHALLENGE
  new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("View the current Nest challenge"),

  // 🛠️ ADMIN — SET CHALLENGE
  new SlashCommandBuilder()
    .setName("setchallenge")
    .setDescription("Set the current Nest weekly challenge")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("The challenge title")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("description")
        .setDescription("What members need to do")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("reward")
        .setDescription("Nest Points reward")
        .setMinValue(0)
        .setRequired(true)
    )
];

module.exports = commands.map(command => command.toJSON());
