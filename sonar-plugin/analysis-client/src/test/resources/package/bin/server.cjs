#!/usr/bin/env node

const { startAnalyzeProjectGrpcServer } = require('../../mock-bridge/analyzeProjectGrpcServer');

const port = process.argv[2];
const host = process.argv[3];

startAnalyzeProjectGrpcServer(port, host);
