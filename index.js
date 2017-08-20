const steem = require('steem');
const redis = require('redis');
const bluebird = require('bluebird');
const _ = require('lodash');
const http = require('http');
const https = require('https');

http.globalAgent.maxSockets = 100;
https.globalAgent.maxSockets = 100;
//steem.api.setOptions({ transport: 'http' });
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const client = redis.createClient(process.env.REDIS_URL);
const username = process.env.STEEM_USERNAME;
const postingWif = process.env.STEEM_POSTING_WIF;
let awaitingBlocks = [];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const streamBlockNumFrom = (from, cb) => {
  let updated;
  steem.api.streamBlockNumber((err, blockNum) => {
    if (!updated && from !== blockNum) {
      updated = true;
      for (let i = parseInt(from) + 1; i < blockNum; i++) {
        cb(null, i);
      }
    }
    cb(null, blockNum);
  });
};

const start = async () => {
  let started;

  const lastBlockNum = await client.getAsync('blockNum');
  console.log('Last Block Num', lastBlockNum);

  streamBlockNumFrom(lastBlockNum, async (err, blockNum) => {
    awaitingBlocks.push(blockNum);

    if (!started) {
      started = true;
      await parseNextBlock();
    }
  });
};

const parseNextBlock = async () => {
  if (awaitingBlocks[0]) {
    const blockNum = awaitingBlocks[0];

    /** Parse Block And Do Vote */
    const block = await steem.api.getBlockWithAsync({ blockNum });
    for (let tx of block.transactions) {
      for (let op of tx.operations) {

        /** Detect Post From Busy 2 */
        if (op[0] === 'comment' && op[1].parent_author === '') {
          let app;
          try {
            app = JSON.parse(op[1].json_metadata).app;
          } catch (err) {}

          if (app && app === 'busy/2.0.0') {
            try {
              const result = await steem.broadcast.voteWithAsync(postingWif, {
                voter: username,
                author: op[1].author,
                permlink: op[1].permlink,
                weight: 10000,
              });
              console.log('Vote Success', op[1].author, op[1].permlink, result);
            } catch (err) {
              console.log('Vote Error', op[1].author, op[1].permlink, err);
            }
            await sleep(4000);
          }
        }
      }
    }

    /** Store On Redis Last Parsed Block */
    await client.setAsync('blockNum', blockNum);
    console.log('Block Parsed', blockNum);

    delete awaitingBlocks[0];
    awaitingBlocks = _.compact(awaitingBlocks);

    await parseNextBlock();

  } else {
    await sleep(4000);
    await parseNextBlock();
  }
};

start();
