console.log('hello from the fork!');

const v8 = require('node:v8');;

console.log('forked execArgv', process.execArgv);
console.log('forked heap', v8.getHeapStatistics().total_available_size / 1024 / 1024 + ' MB');
