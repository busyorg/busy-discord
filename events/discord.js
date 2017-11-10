const Discord = require('discord.js');
const fetch = require('node-fetch');
const bot = new Discord.Client();

fetch.Promise = require('bluebird');

const channelId = process.env.DISCORD_CHANNEL_ID;
let started;

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  started = true;
});

bot.on('message', async msg => {
  if (msg.content === '$ping') {
    msg.reply('Pong!');
  }
  if (
    (
      msg.content.includes('translate')
      || msg.content.includes('translation')
    )
    && msg.content.includes('?')
  ) {
    msg.reply('if you want to translate Busy in your language, please go to this website https://crowdin.com/project/busy if your language is available reserve it on the channel #translate');
  }
  if (msg.content === '$leaderboard') {
    const message = await getLeaderboardMessage();
    msg.reply(message);
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
  const url = `https://busy.org/${op[1].parent_permlink}/@${op[1].author}/${op[1].permlink}`;
  const channel = bot.channels.find('id', channelId);
  channel.send(`**${op[1].title}** *${jsonMetadata.app}*\n${url} `);
};

const getLeaderboardMessage = async () => {
  const users = await fetch('https://data.chainbb.com/users').then(res => res.json());
  let platforms = Object.keys(users.data.platforms)
    .sort((a, b) => parseInt(users.data.platforms[b]) - parseInt(users.data.platforms[a]));
  platforms = platforms.map((app) => {
    return { app, total: users.data.platforms[app] }
  });
  const total = users.data.total;
  let message = 'here is the last 24h Steem apps leaderboard';
  let rank = 0;
  platforms.slice(0, 20).forEach(app => {
    rank++;
    const shares = parseFloat(100 / total * users.data.platforms[app.app]).toFixed(2);
    message += app.app === 'busy'
      ? `\n**${rank} ${app.app}: ${users.data.platforms[app.app]} ${shares}%**`
      : `\n${rank} ${app.app}: ${users.data.platforms[app.app]} ${shares}%`;
  });
  return message;
};

module.exports = trigger;
