#!/usr/bin/env node

const { startAnalyzeProjectGrpcServer } = require('./analyzeProjectGrpcServer');
const port = process.argv[2];
const host = process.argv[3];

console.log(`DEBUG testing debug log`);
console.log(`WARN testing warn log`);
console.log(`testing info log`);

if (process.env.BROWSERSLIST_IGNORE_OLD_DATA) {
  console.log('BROWSERSLIST_IGNORE_OLD_DATA is set to true');
}

startAnalyzeProjectGrpcServer(port, host);
