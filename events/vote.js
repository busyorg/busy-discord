const steem = require('steem');
const _ = require('lodash');
const utils = require('../helpers/utils');
const client = require('../helpers/redis');

const username = process.env.STEEM_USERNAME;
const postingWif = process.env.STEEM_POSTING_WIF;
const weight = parseInt(process.env.STEEM_VOTE_WEIGHT || 10000);
const delay = parseInt(process.env.STEEM_VOTE_DELAY || 43200);

/** Detect Post From Busy 2 And Vote For It */
const trigger = async (op) => {
  if (op[0] === 'comment' && op[1].parent_author === '') {
    let jsonMetadata;
    try {
      jsonMetadata = JSON.parse(op[1].json_metadata);
    } catch (err) {
    }

    if (
      jsonMetadata
      && jsonMetadata.app
      && jsonMetadata.app === 'busy/2.0.0' // Must have 'busy/2.0.0' as app
      && jsonMetadata.tags
      && !jsonMetadata.tags.includes('test') // Must not include tag 'test'
      && jsonMetadata.tags.includes('busy') // Must include tag 'busy'
    ) {

      const hasVote = await client.getAsync(`${op[1].author}:hasVote`);
      if (!hasVote) {
        try {
          const result = await steem.broadcast.voteWithAsync(postingWif, {
            voter: username,
            author: op[1].author,
            permlink: op[1].permlink,
            weight,
          });

          await client.setAsync(`${op[1].author}:hasVote`, 'true', 'EX', delay);
          console.log('Vote Success', op[1].author, op[1].permlink, result);
        } catch (err) {
          console.log('Vote Error', op[1].author, op[1].permlink, err);
        }
        await utils.sleep(4000);
      } else {
        console.log('Has Vote', op[1].author, op[1].permlink);
      }
    }
  }
};

module.exports = trigger;
