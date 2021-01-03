//discord
const Discord = require("discord.js");
const commands = require("./commands.js");
const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Type !help");
});

const prefix = process.env.DISCORD_PREFIX;

client.on("message", msg => {
  //ignore all message without the prefix
  if (!msg.content.startsWith(prefix) || msg.author.bot) return;

  console.log(
    "message recieved from " +
      msg.author.username +
      "#" +
      msg.author.discriminator +
      " at " +
      msg.createdAt
  );

  const args = msg.content
    .slice(prefix.length)
    .trim()
    .split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case "login":
      commands.login(msg);
      break;
    case "help":
      commands.help(msg);
      break;
    case "rank":
      commands.rank(msg, Discord);
      break;
    case "update":
      commands.update(msg, Discord);
      break;
    case "matches":
      commands.matches(msg);
      break;
    case "last":
      commands.last(msg);
      break;
    default:
      break;
  }
});

client.login(process.env.DISCORD_TOKEN);

module.exports = client;
