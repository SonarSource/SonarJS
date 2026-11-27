#!/usr/bin/env node

const { startAnalyzeProjectGrpcServer } = require('./analyzeProjectGrpcServer');
const port = process.argv[2];
const host = process.argv[3];

startAnalyzeProjectGrpcServer(port, host, {
  onStarted: server => {
    setTimeout(() => server.forceShutdown(), 1_500);
  },
});
