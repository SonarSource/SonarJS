
const v8 = require('node:v8');
console.log('I have so much heap RAM:', v8.getHeapStatistics().total_available_size / 1024 / 1024 + ' MB');

//NODE_OPTIONS='--max-old-space-size=2048' ./dist/hello-size
