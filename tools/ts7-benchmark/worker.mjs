import { getCompilerInfo, initializeCompiler } from 'typescript/control';
import '../../packages/analysis/src/jsts/native/compatibility.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { attachNativeProfiler } from '../../packages/analysis/src/jsts/native/profiling.mjs';
import { createPerformanceProfiler, startCpuProfile, summarizeCpuProfile } from './profiling.mjs';
import ts from 'typescript';
import classicParser from '@typescript-eslint/parser';
import {
  createNativePrograms,
  compilerOptionsToJson,
} from '../../packages/analysis/src/jsts/native/session.mjs';
import { build } from '../../packages/analysis/src/jsts/builders/build.ts';
import { sampleNativeMemory } from './memory.mjs';
import { Linter } from '../../packages/analysis/src/jsts/linter/linter.ts';
import { parse } from '../../packages/analysis/src/jsts/parsers/parse.ts';
import { createProgramOptions } from '../../packages/analysis/src/jsts/program/tsconfig/options.ts';
import { createStandardProgram } from '../../packages/analysis/src/jsts/program/factory.ts';
import { IncrementalCompilerHost } from '../../packages/analysis/src/jsts/program/compilerHost.ts';
import {
  setSourceFilesContext,
  clearSourceFileContentCache,
} from '../../packages/analysis/src/jsts/program/cache/sourceFileCache.ts';
import {
  installFsCache,
  getFileSystemCaseSensitivity,
} from '../../packages/shared/src/fs-cache/hook.ts';
import * as metas from '../../packages/analysis/src/jsts/rules/metas.ts';

const [configFile, resultFile] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const root = config.project.replaceAll('\\', '/');
let started = performance.now();
const profiler = config.profile ? createPerformanceProfiler() : undefined;
let detachTiming;
let detachClient;
let stopCpu;
let cpuProfile;
const unsupported = new Map();
const checkerFailures = [];
globalThis[Symbol.for('sonarjs.ts7.unsupported')] = member =>
  unsupported.set(member, (unsupported.get(member) ?? 0) + 1);
const report = {
  backend: config.backend,
  valid: false,
  issues: {},
  files: [],
  errors: [],
  timings: {},
  instrumentation: { metrics: !!config.profile, cpu: !!config.cpuProfile },
  unsupported: {},
  compilerVersion: config.backend === 'classic' ? ts.version : getCompilerInfo().version,
};
let api;
let adapter;
let nativeSession;
let filesystemSession;
try {
  await initializeCompiler();
  const require = createRequire(import.meta.url);
  if (profiler && config.backend !== 'classic')
    [detachTiming, detachClient] = await attachNativeProfiler(profiler);
  if (config.cpuProfile) stopCpu = await startCpuProfile();
  started = performance.now();
  const nativeLibrary = path.join(
    path.dirname(
      require.resolve(
        '@typescript/typescript-' + process.platform + '-' + process.arch + '/package.json',
      ),
    ),
    'lib',
  );
  const libraryDirectories = [path.dirname(ts.getDefaultLibFilePath({})), nativeLibrary];
  if (config.archive) {
    filesystemSession = installFsCache().beginAnalysis({
      archivePath: config.archive,
      mode: config.archiveMode,
      rootDir: root,
      passthroughDirs: libraryDirectories,
      restrictNativeReads: false,
    });
  }
  const selectionStart = performance.now();
  const selections = config.tsconfigs.map(file => {
    const options = createProgramOptions(file, undefined, true, undefined, root);
    if (options.errors?.length)
      throw new Error(ts.formatDiagnostics(options.errors, ts.createCompilerHost(options.options)));
    return { file, options };
  });
  const filenames = [...new Set(selections.flatMap(({ options }) => options.rootNames))]
    .filter(file => /\.[cm]?[jt]sx?$/.test(file) && !/\.d\.[cm]?ts$/.test(file))
    .map(file => file.replaceAll('\\', '/'))
    .sort()
    .slice(0, config.maxFiles ?? Number.MAX_SAFE_INTEGER);
  if (!filenames.length) throw new Error('No source files selected by these tsconfigs');
  const texts = new Map(filenames.map(file => [file, ts.sys.readFile(file)]));
  if ([...texts.values()].some(text => text === undefined))
    throw new Error('A selected source file could not be read');
  report.sourceHashes = Object.fromEntries(
    [...texts].map(([file, text]) => [
      path.relative(root, file).replaceAll('\\', '/'),
      createHash('sha256').update(text).digest('hex'),
    ]),
  );
  setSourceFilesContext(
    Object.fromEntries([...texts].map(([file, fileContent]) => [file, { fileContent }])),
  );
  report.timings.selectionMs = performance.now() - selectionStart;
  const programStart = performance.now();
  profiler?.setPhase('program');
  let programs;
  if (config.backend === 'classic') {
    programs = selections.map(({ options }) =>
      createStandardProgram({
        ...options,
        host: new IncrementalCompilerHost(options.options, root, config.skipOutsideNodeModules),
      }),
    );
  } else {
    nativeSession = createNativePrograms(
      selections.map(({ options }) => options),
      {
        cwd: root,
        requestFiles: texts,
        filesystem: config.filesystem,
        skipOutsideNodeModules: config.skipOutsideNodeModules,
        collectTiming: true,
        onCheckerError: (method, error) => checkerFailures.push({ method, message: error.message }),
      },
    );
    ({ api, adapter, programs } = nativeSession);
    Object.assign(report.timings, nativeSession.timings);
  }
  const membership = programs.map(
    (program, index) =>
      new Set(
        config.backend === 'classic'
          ? program.getSourceFiles().map(file => file.fileName.replaceAll('\\', '/'))
          : nativeSession.rawPrograms[index].getSourceFileNames(),
      ),
  );
  report.timings.programMs = performance.now() - programStart;
  const selectedRules = config.ruleConfig
    ? [...new Set(config.ruleConfig.map(rule => rule.key))]
    : config.rules === 'all'
      ? Object.keys(metas)
      : config.rules === 'recommended'
        ? Object.entries(metas)
            .filter(([, value]) => value.meta.docs.recommended)
            .map(([key]) => key)
        : config.rules;
  for (const key of selectedRules)
    if (!metas[key] || !Linter.rules[key]) throw new Error(`Unknown SonarJS rule ${key}`);
  if (profiler)
    for (const key of selectedRules) Linter.rules[key] = profiler.wrapRule(key, Linter.rules[key]);
  report.rules = selectedRules;
  report.activeRules = {};
  report.programInputs = selections.map(({ file, options }) => ({
    tsconfig: file,
    rootCount: options.rootNames.length,
    compilerOptions: compilerOptionsToJson(options.options),
  }));
  const originalGetRules = Linter.getRulesForFile;
  Linter.getRulesForFile = function (...args) {
    const rules = Reflect.apply(originalGetRules, this, args);
    report.activeRules[path.relative(root, args[0]).replaceAll('\\', '/')] =
      Object.keys(rules).sort();
    return rules;
  };
  profiler?.setPhase('initialize');
  await Linter.initialize({
    baseDir: root,
    detectGeneratedCode: false,
    rules:
      config.ruleConfig ??
      selectedRules.flatMap(key =>
        ['js', 'ts'].map(language => ({
          key,
          configurations: [],
          fileTypeTargets: ['MAIN'],
          language,
          analysisModes: ['DEFAULT'],
        })),
      ),
  });
  let parseMs = 0;
  let lintMs = 0;
  if (profiler) report.fileTimings = [];
  for (const file of filenames) {
    const program = programs[membership.findIndex(files => files.has(file))];
    if (!program) throw new Error(`Program membership missing for ${file}`);
    let parser = classicParser;
    const parserOptions = {
      filePath: file,
      tsconfigRootDir: root,
      sourceType: 'module',
      ecmaVersion: 'latest',
      lib: ['esnext'],
      ecmaFeatures: { jsx: /x$/.test(file) },
      disallowAutomaticSingleRunInference: true,
      onUnsupportedTypeScriptVersion: 'ignore',
    };
    if (config.backend === 'classic') parserOptions.programs = [program];
    const beforeParse = performance.now();
    profiler?.setPhase('parse');
    const parsed =
      config.backend === 'classic'
        ? parse(texts.get(file), parser, parserOptions)
        : build(
            {
              filePath: file,
              fileContent: texts.get(file),
              program,
              tsConfigs: [],
              language: /\.[cm]?jsx?$/.test(file) ? 'js' : 'ts',
              allowTsParserJsFiles: true,
            },
            { jsx: /x$/.test(file) },
          );
    const fileParseMs = performance.now() - beforeParse;
    parseMs += fileParseMs;
    const beforeLint = performance.now();
    profiler?.setPhase('lint');
    const language = /\.[cm]?jsx?$/.test(file) ? 'js' : 'ts';
    const result = Linter.lint(
      parsed,
      file,
      'MAIN',
      'CHANGED',
      'DEFAULT',
      language,
      undefined,
      'module',
    );
    const fileLintMs = performance.now() - beforeLint;
    lintMs += fileLintMs;
    report.fileTimings?.push({
      file: path.relative(root, file).replaceAll('\\', '/'),
      parseMs: fileParseMs,
      lintMs: fileLintMs,
    });
    report.files.push(path.relative(root, file).replaceAll('\\', '/'));
    for (const issue of result.issues) {
      const key = `${language}-${issue.ruleId}`;
      const relative = path.relative(root, file).replaceAll('\\', '/');
      (report.issues[key] ??= {})[relative] ??= [];
      report.issues[key][relative].push(issue.line);
    }
  }
  nativeSession?.assertHealthy();
  report.timings.parseMs = parseMs;
  report.timings.lintMs = lintMs;
  report.filesystem = adapter?.getMetrics();
  report.ipc = api?.getTimingInfo();
  if (profiler) {
    report.profile = profiler.getReport();
    if (api) {
      const keys = ['requestCount', 'roundTripMs', 'bytesSent', 'bytesReceived'];
      report.profile.matchesSdkTotals = keys.every(
        key => report.profile.totals[key] === report.ipc.totals[key],
      );
      if (!report.profile.matchesSdkTotals)
        throw new Error('Profiling totals do not match SDK counters');
    }
  }
  report.valid = unsupported.size === 0 && checkerFailures.length === 0;
} catch (error) {
  report.errors.push({ message: error.message, stack: error.stack });
} finally {
  report.timings.analysisMs = performance.now() - started;
  detachTiming?.();
  detachClient?.();
  if (profiler && !report.profile) report.profile = profiler.getReport();
  if (stopCpu) {
    try {
      cpuProfile = await stopCpu();
      report.cpuProfile = { path: config.cpuProfile, ...summarizeCpuProfile(cpuProfile) };
    } catch (error) {
      report.errors.push({ message: error.message });
      report.valid = false;
    }
  }
  report.memory = {
    nodeMaxRssBytes: process.resourceUsage().maxRSS * 1024,
    nodeRssBytes: process.memoryUsage().rss,
  };
  report.unsupported = Object.fromEntries(unsupported);
  report.checkerFailures = checkerFailures;
  try {
    Linter.releaseAfterAnalysis();
  } catch (error) {
    report.errors.push({ message: error.message });
    report.valid = false;
  }
  // End the project hook before process sampling and report writes. Keep the
  // compiler alive for the RSS sample, but exclude sampling from analysis time.
  try {
    filesystemSession?.end();
  } catch (error) {
    report.errors.push({ message: error.message });
    report.valid = false;
  }
  if (api) {
    try {
      report.memory.native = sampleNativeMemory();
    } catch (error) {
      report.memory.native = { available: false, error: error.message };
    }
    if (report.memory.native.available)
      report.memory.combinedSampleRssBytes =
        report.memory.nodeRssBytes + report.memory.native.rssBytes;
  }
  try {
    nativeSession?.dispose();
  } catch (error) {
    report.errors.push({ message: error.message });
    report.valid = false;
  }
  try {
    if (!nativeSession) api?.close();
  } catch (error) {
    report.errors.push({ message: error.message });
    report.valid = false;
  }
  clearSourceFileContentCache();
  if (cpuProfile) fs.writeFileSync(config.cpuProfile, JSON.stringify(cpuProfile));
  for (const files of Object.values(report.issues))
    for (const lines of Object.values(files)) lines.sort((a, b) => a - b);
  fs.writeFileSync(resultFile, JSON.stringify(report, null, 2) + '\n');
}
if (!report.valid) process.exitCode = 2;
