const steem = require('steem');
const _ = require('lodash');
const utils = require('./utils');

const username = process.env.STEEM_USERNAME;
const postingWif = process.env.STEEM_POSTING_WIF;
const weight = parseInt(process.env.STEEM_VOTE_WEIGHT || 10000);

/** Detect Post From Busy 2 And Vote For It */
const trigger = async (op) => {
  if (op[0] === 'comment' && op[1].parent_author === '') {
    let app;
    try {
      app = JSON.parse(op[1].json_metadata).app;
    } catch (err) {
    }

    if (app && app === 'busy/2.0.0') {
      try {
        const result = await steem.broadcast.voteWithAsync(postingWif, {
          voter: username,
          author: op[1].author,
          permlink: op[1].permlink,
          weight,
        });
        console.log('Vote Success', op[1].author, op[1].permlink, result);
      } catch (err) {
        console.log('Vote Error', op[1].author, op[1].permlink, err);
      }
      await utils.sleep(4000);
    }
  }
};

module.exports = trigger;