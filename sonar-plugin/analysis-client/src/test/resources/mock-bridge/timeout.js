#!/usr/bin/env node

const { startAnalyzeProjectGrpcServer } = require('./analyzeProjectGrpcServer');
const port = process.argv[2];
const host = process.argv[3];

startAnalyzeProjectGrpcServer(port, host, {
  AnalyzeProject: async () => {
    await sleep(1_000);
  },
  AnalyzeProjectUnary: async () => {
    await sleep(1_000);
  },
});

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
