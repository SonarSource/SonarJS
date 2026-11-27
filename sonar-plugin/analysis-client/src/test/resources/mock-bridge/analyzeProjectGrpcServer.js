#!/usr/bin/env node

const path = require('node:path');
const grpc = require('@grpc/grpc-js');
const protobuf = require('protobufjs');

const ANALYZE_PROJECT_SERVICE_NAME = 'sonarjs.analyzeproject.v1.AnalyzeProjectService';
const GRPC_SERVER_OPTIONS = {
  'grpc.max_receive_message_length': -1,
  'grpc.max_send_message_length': -1,
};
const PROTO_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'packages',
  'grpc',
  'src',
  'proto',
  'analyze-project.proto',
);

let cachedTypes;

function loadTypes() {
  if (cachedTypes) {
    return cachedTypes;
  }

  const root = new protobuf.Root();
  root.loadSync(PROTO_PATH);
  const ns = 'sonarjs.analyzeproject.v1';
  cachedTypes = {
    AnalyzeProjectRequest: root.lookupType(`${ns}.AnalyzeProjectRequest`),
    AnalyzeProjectStreamResponse: root.lookupType(`${ns}.AnalyzeProjectStreamResponse`),
    AnalyzeProjectUnaryResponse: root.lookupType(`${ns}.AnalyzeProjectUnaryResponse`),
    CancelAnalysisRequest: root.lookupType(`${ns}.CancelAnalysisRequest`),
    CancelAnalysisResponse: root.lookupType(`${ns}.CancelAnalysisResponse`),
    LeaseRequest: root.lookupType(`${ns}.LeaseRequest`),
    LeaseResponse: root.lookupType(`${ns}.LeaseResponse`),
  };
  return cachedTypes;
}

function serializer(typeName) {
  const types = loadTypes();
  const type = types[typeName];
  return value => Buffer.from(type.encode(type.fromObject(value)).finish());
}

function deserializer(typeName) {
  const types = loadTypes();
  const type = types[typeName];
  return buffer => type.decode(buffer);
}

function createServiceDefinition() {
  return {
    AnalyzeProject: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/AnalyzeProject`,
      requestStream: false,
      responseStream: true,
      requestSerialize: serializer('AnalyzeProjectRequest'),
      requestDeserialize: deserializer('AnalyzeProjectRequest'),
      responseSerialize: serializer('AnalyzeProjectStreamResponse'),
      responseDeserialize: deserializer('AnalyzeProjectStreamResponse'),
    },
    AnalyzeProjectUnary: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/AnalyzeProjectUnary`,
      requestStream: false,
      responseStream: false,
      requestSerialize: serializer('AnalyzeProjectRequest'),
      requestDeserialize: deserializer('AnalyzeProjectRequest'),
      responseSerialize: serializer('AnalyzeProjectUnaryResponse'),
      responseDeserialize: deserializer('AnalyzeProjectUnaryResponse'),
    },
    CancelAnalysis: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/CancelAnalysis`,
      requestStream: false,
      responseStream: false,
      requestSerialize: serializer('CancelAnalysisRequest'),
      requestDeserialize: deserializer('CancelAnalysisRequest'),
      responseSerialize: serializer('CancelAnalysisResponse'),
      responseDeserialize: deserializer('CancelAnalysisResponse'),
    },
    Lease: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/Lease`,
      requestStream: true,
      responseStream: true,
      requestSerialize: serializer('LeaseRequest'),
      requestDeserialize: deserializer('LeaseRequest'),
      responseSerialize: serializer('LeaseResponse'),
      responseDeserialize: deserializer('LeaseResponse'),
    },
  };
}

function startAnalyzeProjectGrpcServer(port, host, handlers = {}) {
  const server = new grpc.Server(GRPC_SERVER_OPTIONS);
  const serviceDefinition = createServiceDefinition();
  const onStarted = handlers.onStarted;

  const implementation = {
    AnalyzeProject:
      handlers.AnalyzeProject ??
      (call => {
        call.end();
      }),
    AnalyzeProjectUnary: handlers.AnalyzeProjectUnary ?? ((_, callback) => callback(null, {})),
    CancelAnalysis:
      handlers.CancelAnalysis ?? ((_, callback) => callback(null, { cancelled: true })),
    Lease:
      handlers.Lease ??
      (call => {
        const shutdown = () => {
          try {
            call.end();
          } catch {
            // ignore
          }
          setImmediate(() => server.forceShutdown());
        };
        call.on('data', () => {});
        call.on('cancelled', shutdown);
        call.on('end', shutdown);
        call.on('error', shutdown);
      }),
  };

  server.addService(serviceDefinition, implementation);
  server.bindAsync(
    `${host}:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        console.log('something bad happened', error);
        process.exitCode = 1;
        return;
      }
      server.start();
      console.log(`gRPC analyze-project server listening on ${host}:${boundPort}`);
      onStarted?.(server);
    },
  );
  return server;
}

module.exports = {
  startAnalyzeProjectGrpcServer,
};
