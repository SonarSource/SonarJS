const path = require('node:path');
const { installCompilerGateway, TypeScriptFailure } = require('./gateway.cjs');

let gateway;
let backend;
let initialization;
function getCompilerGateway() {
  if (gateway) return gateway;
  const selection = process.env.SONARJS_TYPESCRIPT_BACKEND ?? 'ts6';
  const bundled = typeof __SONARJS_BUNDLED__ !== 'undefined' && __SONARJS_BUNDLED__;
  if (!['ts6', 'ts7'].includes(selection)) {
    throw new TypeScriptFailure(
      'unsupported-operation',
      `Compiler backend is not implemented: ${selection}`,
    );
  }
  if (bundled && selection !== 'ts6') {
    throw new TypeScriptFailure(
      'unsupported-operation',
      'The experimental TS7 backend is not packaged in the standalone bridge yet',
    );
  }
  // This is the only TS6 SDK load in the module. Consumers cannot import its alias.
  const ts = require('typescript-classic');
  const privateRoots = [
    __dirname,
    bundled ? __dirname : path.dirname(require.resolve('typescript-classic/package.json')),
    path.resolve(__dirname, '../analysis/src/jsts/native'),
    path.resolve(__dirname, '../../lib/analysis/src/jsts/native'),
  ];
  const exports = { ...ts };
  backend = selection === 'ts6' ? undefined : require('./native.cjs').createBackend(ts);
  Object.assign(exports, backend?.compiler);
  gateway = installCompilerGateway({
    name: selection,
    exports,
    packageMetadata: { name: 'typescript', version: exports.version },
    implementationRoots: privateRoots,
    assertHealthy: () => {
      backend?.assertHealthy();
    },
  });
  return gateway;
}
module.exports = {
  TypeScriptFailure,
  installCompilerGateway: provider => (gateway = installCompilerGateway(provider)),
  getCompilerGateway,
  initializeCompiler: () => {
    getCompilerGateway();
    return (initialization ??= Promise.resolve().then(() => backend?.initialize()));
  },
  getCompilerInfo: () => {
    const selected = getCompilerGateway();
    const sdkRoot =
      selected.provider === 'ts7'
        ? path.dirname(require.resolve('typescript-native/package.json'))
        : undefined;
    return {
      backend: selected.provider,
      compatibilityVersion: selected.facade.version,
      version: sdkRoot
        ? require(path.join(sdkRoot, 'package.json')).version
        : selected.facade.version,
      sdkRoot,
    };
  },
  prepareProgramRequest: events => {
    getCompilerGateway();
    backend?.projects().prepareNativeProgramRequest(events);
  },
  finishProgramRequest: keep => {
    getCompilerGateway();
    backend?.projects().finishNativeProgramRequest(keep);
    gateway.assertHealthy();
  },
  clearProgramCache: () => {
    getCompilerGateway();
    backend?.projects().clearNativeProgramCache();
  },
  getProgramFileNames: program => {
    getCompilerGateway();
    return backend
      ? backend.runtime().getProgramFileNames(program)
      : program.getSourceFiles().map(file => file.fileName);
  },
  getProjectCache: () => {
    getCompilerGateway();
    return backend
      ? { getProgram: (...args) => backend.projects().createOrGetCachedProgramForFile(...args) }
      : undefined;
  },
  getCompilerCachePolicy: () => {
    getCompilerGateway();
    return { retainAnalysisStateForIDE: !backend };
  },
};
