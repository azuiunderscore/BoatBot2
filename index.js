const Discord = require('discord.js');
const client = new Discord.Client();

// log when the bot is ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// listen to messages and reply
client.on('message', msg => {
  if (msg.content === 'hello') {
    msg.reply('hey there!');
  }
});
