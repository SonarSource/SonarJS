//const { execSync } = require('child_process');
const { fork } = require('child_process');
const { join: pJoin } = require('path');
const v8 = require('node:v8');
console.log('wala')

//execSync('echo walala', { stdio: 'inherit' });
/* execSync('node --max-old-space-size=5678 -e "console.log(\'yoho\'); const v8 = require(\'node:v8\'); console.log(v8.getHeapStatistics().total_available_size / 1024 / 1024 + \' MB\');"', {
  stdio: 'inherit'
}); */
const filepath = pJoin(__dirname, 'forked-file.js');

/* fork(filepath, [], {
  execArgv: ['--max-old-space-size=5678']
}); */
console.log('parent execArgv', process.execArgv);
console.log('parent heap', v8.getHeapStatistics().total_available_size / 1024 / 1024 + ' MB');
