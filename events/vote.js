const steem = require('steem');
const _ = require('lodash');
const fetch = require('node-fetch');
fetch.Promise = require('bluebird');
const utils = require('../helpers/utils');
const client = require('../helpers/redis');

const username = process.env.STEEM_USERNAME;
const postingWif = process.env.STEEM_POSTING_WIF;

// Delay between 2 votes is 12 hours
const delay = parseInt(process.env.STEEM_VOTE_DELAY || 43200);
// Amount required to get the minimum upvote (0.5%) is 10000000 VESTS ~ 1 Dolphin ~ 5 000 SP
const minVests = process.env.MIN_VESTS || 10000000;
// Amount required to get 100% upvote is 1000000000000 VESTS ~ 500 Whales ~ 500 000 000 SP
const maxVests = process.env.MAX_VESTS || 1000000000000;
// Don't upvote user beyond 1000000000000 VESTS
const limitVests = process.env.LIMIT_VESTS || 1000000000000;
// Don't upvote more than 25%
const maxUpvote = process.env.MAX_UPVOTE || 2500;

const calculateVotingPower = async (username) => {
  const url = `https://steemdb.com/api/accounts?account[]=${username}`;
  let votingPower = 0;
  try {
    const [account] = await fetch(url).then(res => res.json());
    votingPower = account.followers_mvest >= minVests ? parseFloat(10000 / maxVests * account.followers_mvest) : 0;
    votingPower = votingPower > 10000 ? 10000 : parseFloat(votingPower);
    votingPower = (votingPower > 0 && votingPower < 50) ? 50 : parseInt(votingPower);
    if (maxUpvote) {
      votingPower = votingPower > maxUpvote ? maxUpvote : votingPower;
    }
    if (limitVests && account.followers_mvest >= limitVests) {
      votingPower = 0;
    }
  } catch (e) {
    console.log(e);
  }
  return votingPower;
};

/** Detect post from Busy and vote for it */
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
      && typeof jsonMetadata.app === 'string'
      && jsonMetadata.app.includes('busy') // Must have 'busy/' as app
      && jsonMetadata.tags
      && !jsonMetadata.tags.includes('test') // Must not include tag 'test'
      && jsonMetadata.tags.includes('busy') // Must include tag 'busy'
    ) {

      const hasVote = await client.getAsync(`${op[1].author}:hasVote`);
      if (!hasVote && !op[1].body.includes('@@')) {
        const weight = await calculateVotingPower(op[1].author);
        if (weight) {
          try {
            const result = await steem.broadcast.voteWithAsync(postingWif, {
              voter: username,
              author: op[1].author,
              permlink: op[1].permlink,
              weight,
            });

            await client.setAsync(`${op[1].author}:hasVote`, 'true', 'EX', delay);
            console.log('Vote success', op[1].author, op[1].permlink, result);
          } catch (err) {
            console.log('Vote error', op[1].author, op[1].permlink, err);
          }
          await utils.sleep(4000);
        } else {
          console.log('Not enought followers weight', op[1].author, op[1].permlink, weight);
        }
      } else {
        console.log('Has already vote', op[1].author, op[1].permlink);
      }
    }
  }
};

module.exports = trigger;
