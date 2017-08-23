const steem = require('steem');
const _ = require('lodash');
const http = require('http');
const https = require('https');
const client = require('./helpers/redis');
const vote = require('./events/vote');
const slack = require('./events/slack');
const utils = require('./helpers/utils');

http.globalAgent.maxSockets = 100;
https.globalAgent.maxSockets = 100;
//steem.api.setOptions({ transport: 'http' });
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
          slack(op);
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
