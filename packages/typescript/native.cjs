const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { TypeScriptFailure } = require('./errors.cjs');

// All native-specific integration is private to the selected module provider.
exports.createBackend = ts => {
  const unsupported = Object.fromEntries(
    Object.keys(ts)
      .filter(name =>
        /^(?:create.*(?:Program|CompilerHost)|createLanguageService|createTypeChecker|createWatch)/.test(
          name,
        ),
      )
      .map(name => [
        name,
        () => {
          throw new TypeScriptFailure(
            'unsupported-operation',
            `TS7 does not implement ${name}`,
            name,
          );
        },
      ]),
  );
  const directory =
    process.env.SONARJS_TYPESCRIPT_SOURCE === '1'
      ? path.resolve(__dirname, '../analysis/src/jsts')
      : path.resolve(__dirname, '../../lib/analysis/src/jsts');
  let loadedRuntime, loadedProjects;
  let instrumentation = {};
  const runtime = () => {
    if (!loadedRuntime)
      throw new Error('Initialize the selected compiler backend before creating programs');
    return loadedRuntime;
  };
  const projects = () => {
    if (!loadedProjects)
      throw new Error('Initialize the selected compiler backend before using project sessions');
    return loadedProjects;
  };
  return {
    configureInstrumentation(options) {
      if (options.filesystem && !['callbacks', 'layer'].includes(options.filesystem))
        throw new Error('Compiler filesystem must be callbacks or layer');
      instrumentation = { collectTiming: !!options.collectTiming, filesystem: options.filesystem };
    },
    async initialize() {
      if (process.env.SONARJS_TYPESCRIPT_BACKEND === 'wasm') {
        const wasm = await import(pathToFileURL(path.join(__dirname, 'wasm/runtime.mjs')).href);
        await wasm.initializeWasm();
      }
      await import(pathToFileURL(path.join(directory, 'native/compatibility.mjs')).href);
      loadedRuntime = await import(pathToFileURL(path.join(directory, 'native/session.mjs')).href);
      loadedProjects = await import(
        pathToFileURL(
          path.join(
            directory,
            `native/projects.${process.env.SONARJS_TYPESCRIPT_SOURCE === '1' ? 'ts' : 'js'}`,
          ),
        ).href
      );
    },
    runtime,
    projects,
    assertHealthy: () => loadedRuntime?.assertNativeProgramsHealthy(),
    compiler: {
      ...unsupported,
      // Native AST adapters currently implement the TS6 compatibility shape.
      version: ts.version,
      versionMajorMinor: ts.versionMajorMinor,
      createCompilerHost(options, parents) {
        return {
          ...ts.createCompilerHost(options, parents),
          readDirectory: ts.sys.readDirectory,
          getDefaultLibLocation: () => runtime().getNativeLibraryDirectory(),
          getDefaultLibFileName: options =>
            `${runtime().getNativeLibraryDirectory()}/${ts.getDefaultLibFileName(options)}`,
        };
      },
      getDefaultLibFilePath: options =>
        `${runtime().getNativeLibraryDirectory()}/${ts.getDefaultLibFileName(options)}`,
      createProgram(options, compilerOptions, host) {
        const input = Array.isArray(options)
          ? { rootNames: options, options: compilerOptions, host }
          : options;
        const callbacks = input.host;
        const fs = callbacks
          ? {
              readFile: file => callbacks.readFile(file),
              fileExists: file => callbacks.fileExists(file),
              directoryExists: file => {
                // Like TS6, an omitted optional directory probe means "unknown",
                // not permission to bypass a supplied host with direct disk reads.
                return callbacks.directoryExists ? callbacks.directoryExists(file) : true;
              },
              realpath: file => (callbacks.realpath ? callbacks.realpath(file) : file),
              getAccessibleEntries: directory => {
                return {
                  files: (
                    callbacks.readDirectory?.(directory, undefined, undefined, ['*'], 1) ?? []
                  ).map(file => path.basename(file)),
                  directories: (callbacks.getDirectories?.(directory) ?? []).map(file =>
                    path.basename(file),
                  ),
                  symlinks: [],
                };
              },
            }
          : undefined;
        return runtime().createNativePrograms([input], { ...instrumentation, fs }).programs[0];
      },
      createSemanticDiagnosticsBuilderProgram() {
        throw new TypeScriptFailure(
          'unsupported-operation',
          'TS7 builder-program compatibility is not implemented; use retained native project requests',
          'createSemanticDiagnosticsBuilderProgram',
        );
      },
    },
  };
};
