const steem = require('steem');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const streamBlockNumFrom = (from, delay, cb) => {
  let updated;
  steem.api.streamBlockNumber('irreversible', (err, blockNum) => {
    if (!updated && from !== blockNum) {
      updated = true;
      for (let i = parseInt(from) + 1; i < blockNum; i++) {
        cb(null, i - delay);
      }
    }
    cb(null, blockNum);
  });
};

module.exports = {
  streamBlockNumFrom,
  sleep,
};
