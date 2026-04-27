#!/usr/bin/env node

const { startAnalyzeProjectGrpcServer } = require('./analyzeProjectGrpcServer');
const port = process.argv[2];
const host = process.argv[3];

startAnalyzeProjectGrpcServer(port, host, {
  AnalyzeProjectUnary: (_, callback) => {
    callback(new Error('Invalid response'));
  },
});
