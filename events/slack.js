const Bot = require('slackbots');
const alpha = require('./alpha.json');

let started;
const settings = {
  token: process.env.SLACK_API_TOKEN,
  name: 'robot'
};
const bot = new Bot(settings);
bot.on('start', () => {
  started = true;
});

/** Trigger Every Comment Or Post From Busy */
const trigger = (op) => {
  if (op[0] === 'comment') {
    let jsonMetadata;
    try {
      jsonMetadata = JSON.parse(op[1].json_metadata);
    } catch (err) {
    }

    if (started && jsonMetadata && jsonMetadata.app) {

      if (jsonMetadata.app.includes('busy/1')) {
        console.log('New Comment', `@${op[1].author} with ${jsonMetadata.app}`);
        postMessage('activity-1', op);
      }

      if (jsonMetadata.app.includes('busy/2')) {
        console.log('New Comment', `@${op[1].author} with ${jsonMetadata.app}`);
        postMessage('activity-2', op);
      }

      if (alpha.includes(op[1].author) && !jsonMetadata.app.includes('busy')) {
        postMessage('activity-0', op);
      }
    }
  }
};

const postMessage = (channel, op) => {
  let message = `*<https://nd.busy.org/@${op[1].author}|@${op[1].author}>* ${jsonMetadata.app} `;
  message += op[1].parent_author ? 'post' : 'comment';
  bot.postMessageToChannel(
    channel,
    message,
    { mrkdwn_in: ["text"] }
  );
};

module.exports = trigger;
