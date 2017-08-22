const Bot = require('slackbots');

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

    if (
      jsonMetadata
      && jsonMetadata.app
      && jsonMetadata.app.includes('busy/')
    ) {
      console.log('New Comment', `@${op[1].author} with ${jsonMetadata.app}`);
      if (started) {
        bot.postMessageToChannel(
          'activity',
          `*<https://nd.busy.org/@${op[1].author}|@${op[1].author}>* ${jsonMetadata.app}: \`\`\`${op[1].body}\`\`\``,
          { mrkdwn_in: ["text"] }
        );
      }
    }
  }
};

module.exports = trigger;
