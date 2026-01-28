#!/usr/bin/env node
/**
 * Shared gRPC helper for mock bridge servers.
 * Uses CommonJS to work with the existing mock-bridge scripts.
 */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('node:path');
const fs = require('node:fs');

// Find proto files - they can be in different locations depending on where we run from
// When running from src/test/resources: ../../../../../../packages/grpc/src/proto
// When running from target/test-classes: ../../../classes
function findProtoDir() {
  // First try: relative to source location
  let protoDir = path.join(
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
  );
  if (fs.existsSync(path.join(protoDir, 'health.proto'))) {
    return protoDir;
  }

  // Second try: relative to target/test-classes/mock-bridge
  protoDir = path.join(__dirname, '..', '..', '..', 'classes');
  if (fs.existsSync(path.join(protoDir, 'health.proto'))) {
    return protoDir;
  }

  // Third try: go up to find sonar-plugin/bridge and then to packages
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const packagesProto = path.join(dir, 'packages', 'grpc', 'src', 'proto');
    if (fs.existsSync(path.join(packagesProto, 'health.proto'))) {
      return packagesProto;
    }
    dir = path.dirname(dir);
  }

  throw new Error(`Cannot find proto files from ${__dirname}`);
}

const PROTO_DIR = findProtoDir();
const HEALTH_PROTO_PATH = path.join(PROTO_DIR, 'health.proto');
const BRIDGE_PROTO_PATH = path.join(PROTO_DIR, 'bridge.proto');

// Proto loader options
const loaderOptions = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// Health check service constants
const SERVING = 'SERVING';
const NOT_SERVING = 'NOT_SERVING';
const SERVICE_UNKNOWN = 'SERVICE_UNKNOWN';

// Load and cache proto definitions
let healthProto = null;
let bridgeProto = null;

function loadProtos() {
  if (!healthProto) {
    const healthPackageDef = protoLoader.loadSync(HEALTH_PROTO_PATH, loaderOptions);
    healthProto = grpc.loadPackageDefinition(healthPackageDef);
  }
  if (!bridgeProto) {
    const bridgePackageDef = protoLoader.loadSync(BRIDGE_PROTO_PATH, loaderOptions);
    bridgeProto = grpc.loadPackageDefinition(bridgePackageDef);
  }
  return { healthProto, bridgeProto };
}

/**
 * Create a default health check handler that returns SERVING status.
 */
function createHealthCheckHandler() {
  return (call, callback) => {
    const serviceName = call.request.service || '';
    const isKnownService =
      serviceName === '' ||
      serviceName === 'bridge.BridgeService' ||
      serviceName === 'analyzer.LanguageAnalyzerService';

    if (!isKnownService) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Service "${serviceName}" not found`,
      });
      return;
    }

    callback(null, { status: SERVING });
  };
}

/**
 * Get a fake analysis response for JS/TS files.
 */
function getFakeJsTsAnalysisResponse(skipAst) {
  const response = {
    issues: [
      {
        line: 0,
        column: 0,
        endLine: 0,
        endColumn: 0,
        message: '',
        ruleId: '',
        language: 'js',
        secondaryLocations: [],
        quickFixes: [
          {
            message: '',
            edits: [
              {
                text: '',
                loc: { line: 0, column: 0, endLine: 0, endColumn: 0 },
              },
            ],
          },
        ],
      },
    ],
    highlights: [
      {
        location: { startLine: 0, startCol: 0, endLine: 0, endCol: 0 },
        textType: '',
      },
    ],
    metrics: {
      ncloc: [],
      commentLines: [],
      nosonarLines: [],
      executableLines: [],
      functions: 0,
      statements: 0,
      classes: 0,
      complexity: 0,
      cognitiveComplexity: 0,
    },
    highlightedSymbols: [
      {
        declaration: { startLine: 0, startCol: 0, endLine: 0, endCol: 0 },
        references: [],
      },
    ],
    cpdTokens: [
      {
        location: { startLine: 0, startCol: 0, endLine: 0, endCol: 0 },
        image: '',
      },
    ],
  };

  if (!skipAst) {
    // Read the serialized proto AST file
    // It can be in different locations:
    // - From source: ../files/serialized.proto
    // - From target/test-classes: ../files/serialized.proto (same relative path)
    const astPath = path.join(__dirname, '..', 'files', 'serialized.proto');
    if (fs.existsSync(astPath)) {
      response.ast = fs.readFileSync(astPath);
    }
  }

  return response;
}

/**
 * Get a fake analysis response for CSS files.
 */
function getFakeCssAnalysisResponse() {
  return {
    issues: [
      {
        line: 0,
        column: 0,
        endLine: 0,
        endColumn: 0,
        message: '',
        ruleId: '',
      },
    ],
  };
}

/**
 * Get a fake analysis response for YAML/HTML files (embedded JS).
 */
function getFakeEmbeddedAnalysisResponse() {
  return {
    issues: [
      {
        line: 0,
        column: 0,
        endLine: 0,
        endColumn: 0,
        message: '',
        ruleId: '',
        language: 'js',
        secondaryLocations: [],
        quickFixes: [
          {
            message: '',
            edits: [
              {
                text: '',
                loc: { line: 0, column: 0, endLine: 0, endColumn: 0 },
              },
            ],
          },
        ],
      },
    ],
    metrics: { ncloc: [] },
  };
}

/**
 * Create default BridgeService handlers.
 */
function createDefaultBridgeHandlers(options = {}) {
  const { onClose } = options;

  return {
    initLinter: (call, callback) => {
      // Log the request for test verification
      const request = call.request;
      const logData = JSON.stringify({
        rules: (request.rules || []).map(r => ({
          key: r.key,
          fileTypeTargets: r.fileTypeTargets,
          configurations: r.configurations,
          analysisModes: r.analysisModes,
          blacklistedExtensions: r.blacklistedExtensions,
          language: r.language,
        })),
        environments: request.environments || [],
        globals: request.globals || [],
        baseDir: request.baseDir || '',
        sonarlint: request.sonarlint || false,
        bundles: request.bundles || [],
      });
      console.log(logData);
      callback(null, { success: true });
    },

    analyzeJsTs: (call, callback) => {
      const request = call.request;
      console.log(JSON.stringify(request));
      const response = getFakeJsTsAnalysisResponse(request.skipAst);
      callback(null, response);
    },

    analyzeCss: (call, callback) => {
      const request = call.request;
      console.log(JSON.stringify(request));
      callback(null, getFakeCssAnalysisResponse());
    },

    analyzeYaml: (call, callback) => {
      const request = call.request;
      console.log(JSON.stringify(request));
      callback(null, getFakeEmbeddedAnalysisResponse());
    },

    analyzeHtml: (call, callback) => {
      const request = call.request;
      console.log(JSON.stringify(request));
      callback(null, getFakeEmbeddedAnalysisResponse());
    },

    analyzeProject: call => {
      const request = call.request;
      const files = request.files || {};
      const skipAst = request.configuration?.skipAst || false;

      // Send a file result for each file
      Object.keys(files).forEach(filePath => {
        call.write({
          fileResult: {
            filename: filePath,
            analysis: getFakeJsTsAnalysisResponse(skipAst),
          },
        });
      });

      // Send final meta
      call.write({
        meta: { warnings: [] },
      });

      call.end();
    },

    cancelAnalysis: (call, callback) => {
      callback(null, { success: true });
    },

    close: (call, callback) => {
      callback(null, { success: true });
      if (onClose) {
        setImmediate(onClose);
      }
    },
  };
}

/**
 * Create and start a gRPC mock server.
 */
function createMockGrpcServer(options = {}) {
  const {
    port = process.argv[2] || 0,
    host = process.argv[3] || '127.0.0.1',
    healthHandler = createHealthCheckHandler(),
    bridgeHandlers = null,
    onServerStarted = null,
    onClose = null,
  } = options;

  const { healthProto, bridgeProto } = loadProtos();

  const server = new grpc.Server({
    'grpc.max_receive_message_length': 100 * 1024 * 1024,
    'grpc.max_send_message_length': 100 * 1024 * 1024,
  });

  // Add Health service
  server.addService(healthProto.grpc.health.v1.Health.service, {
    Check: healthHandler,
  });

  // Add BridgeService
  const handlers = bridgeHandlers || createDefaultBridgeHandlers({ onClose });
  server.addService(bridgeProto.bridge.BridgeService.service, handlers);

  // Start the server
  server.bindAsync(
    `${host}:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        process.exit(1);
      }
      console.log(`server is listening on ${host} ${boundPort}`);
      if (onServerStarted) {
        onServerStarted(server, boundPort);
      }
    },
  );

  return server;
}

module.exports = {
  grpc,
  loadProtos,
  createHealthCheckHandler,
  createDefaultBridgeHandlers,
  createMockGrpcServer,
  getFakeJsTsAnalysisResponse,
  getFakeCssAnalysisResponse,
  getFakeEmbeddedAnalysisResponse,
  SERVING,
  NOT_SERVING,
  SERVICE_UNKNOWN,
};
