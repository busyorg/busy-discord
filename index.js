const steem = require('steem');
const redis = require('redis');
const bluebird = require('bluebird');
const _ = require('lodash');
const http = require('http');
const https = require('https');
const vote = require('./vote');
const utils = require('./utils');

http.globalAgent.maxSockets = 100;
https.globalAgent.maxSockets = 100;
//steem.api.setOptions({ transport: 'http' });
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const client = redis.createClient(process.env.REDIS_URL);
let awaitingBlocks = [];

const start = async () => {
  let started;

  const lastBlockNum = await client.getAsync('blockNum');
  console.log('Last Block Num', lastBlockNum);

  utils.streamBlockNumFrom(lastBlockNum, async (err, blockNum) => {
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

    if (_.has(block, 'transactions[0].operations')) {
      for (let tx of block.transactions) {
        for (let op of tx.operations) {
          await vote(op);
        }
      }
    }

    /** Store On Redis Last Parsed Block */
    try {
      await client.setAsync('blockNum', blockNum);
      console.log('Block Parsed', blockNum);
    } catch (err) {
      console.log('Error Save Redis', blockNum, err);
    }

    delete awaitingBlocks[0];
    awaitingBlocks = _.compact(awaitingBlocks);

    await parseNextBlock();

  } else {
    await utils.sleep(4000);
    await parseNextBlock();
  }
};

start();
