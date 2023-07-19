console.log('hello world!');

console.log('my argv:', process.argv);

const v8 = require('node:v8');
console.log(v8.getHeapStatistics().total_available_size / 1024 / 1024 + ' MB');

//NODE_OPTIONS='--max-old-space-size=2048' ./dist/hello-size
