const Discord = require('discord.js');
const bot = new Discord.Client();

const channelId = process.env.DISCORD_CHANNEL_ID;
let started;

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  started = true;
});

bot.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('Pong!');
  }
  if (msg.content.includes('beta tester ')) {
    msg.reply('*if you want to test new busy please follow the instructions in the channel #announcements*');
  }
  if (msg.content.includes('translate in ')) {
    msg.reply('*if you want to translate Busy in your language, please go to this website https://crowdin.com/project/busy if your language is available reserve it on the channel #translate*');
  }
});

bot.login(process.env.DISCORD_TOKEN);

/** Trigger Every Comment Or Post From Busy */
const trigger = (op) => {
  if (op[0] === 'comment') {
    let jsonMetadata;
    try {
      jsonMetadata = JSON.parse(op[1].json_metadata);
    } catch (err) {}
    if (
      started
      && jsonMetadata
      && jsonMetadata.app
      && typeof jsonMetadata.app === 'string'
      && jsonMetadata.app.includes('busy')
    ) {
      if (!op[1].body.includes('@@') && !op[1].parent_author) {
        postMessage(op);
      }
    }
  }
};

const postMessage = (op) => {
  let jsonMetadata;
  try {
    jsonMetadata = JSON.parse(op[1].json_metadata);
  } catch (err) {}
  const url = `https://nd.busy.org/${op[1].parent_permlink}/@${op[1].author}/${op[1].permlink}`;
  const channel = bot.channels.find('id', channelId);
  channel.send(`**${op[1].title}** *${jsonMetadata.app}*\n${url} `);
};

module.exports = trigger;
