const Bot = require('slackbots');

let started;
const settings = {
  token: process.env.SLACK_API_TOKEN,
  name: 'My Bot'
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
      console.log(jsonMetadata.app);
      if (started) {
        bot.postMessageToChannel(
          'activity',
          `*${op[1].parent_permlink}/@${op[1].author}/${op[1].permlink}*: \`\`\`${op[1].body}\`\`\``,
          { mrkdwn_in: ["text"] }
        );
      }
    }
  }
};

module.exports = trigger;
