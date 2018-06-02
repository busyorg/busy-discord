const Discord = require('discord.js');
const fetch = require('node-fetch');
fetch.Promise = require('bluebird');

const bot = new Discord.Client();
const discordToken = process.env.DISCORD_TOKEN;
let started;

setInterval(() => {
  console.log('heartbeat', Date.now());
}, 10 * 1000);

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  started = true;
});

bot.on('message', async msg => {
  if (msg.content === '$ping') {
    msg.reply('Pong!');
  }
  if (
    msg.content === '$leaderboard'
    || msg.content === '$rank'
  ) {
    const message = await getLeaderboardMessage();
    msg.reply(message);
  }
});

if (discordToken) {
  bot.login(discordToken);
}

const getLeaderboardMessage = async () => {
  const objApps = await fetch('https://steem-sincerity.dapptools.info/s/api/most-used-apps/')
    .then(res => res.json());

  let total = 0;
  objApps.data.forEach(app => {
    total += app.active_accounts_count;
  });

  let rank = 0;
  let message = 'here is the last 7 days active users leaderboard';
  objApps.data.slice(0, 20).forEach(app => {
    rank++;
    const shares = parseFloat(100 / total * app.active_accounts_count).toFixed(2);
    message += app.app === 'busy' || app.app === 'bsteem'
      ? `\n**${rank} ${app.app}: ${app.active_accounts_count} ${shares}%**`
      : `\n${rank} ${app.app}: ${app.active_accounts_count} ${shares}%`;
  });
  message += '\nhttp://steemreports.com/sincerity-most-used-apps/';
  return message;
};
