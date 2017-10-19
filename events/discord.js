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
