import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { compilerOptionsToJson as serializeCompilerOptions } from '../../packages/typescript/compiler-options.cjs';
import { legacyRulingInputs } from './ruling-inputs.mjs';
import { normalizeDiagnostics, canonical } from './results.mjs';
import { assertCompilerRouting } from './routing.mjs';

const [configPath, outputPath] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const report = {
  schemaVersion: 1,
  project: config.name,
  backend: config.backend,
  round: config.round,
  valid: false,
  errors: [],
  timings: {},
  files: [],
  sourceHashes: {},
  activeRules: {},
  issues: {},
  diagnostics: {},
  programInputs: [],
};
const started = performance.now();
const runtimeRoot = config.runtime?.root ?? fileURLToPath(new URL('../../', import.meta.url));
const direct = config.runtime?.kind === 'direct';
const require = createRequire(path.join(runtimeRoot, 'package.json'));
const load = file => import(pathToFileURL(path.join(runtimeRoot, file)).href);
let control;
try {
  const before = performance.now();
  if (!direct) {
    if (['ts7', 'wasm'].includes(process.env.SONARJS_TYPESCRIPT_BACKEND))
      await load('packages/analysis/src/jsts/native/compatibility.mjs');
    control = require('typescript/control');
    control.getCompilerGateway();
  }
  const ts = require('typescript');
  await import(pathToFileURL(require.resolve('tsx')).href);
  await control?.initializeCompiler();
  report.timings.compilerInitializationMs = performance.now() - before;
  report.compiler = control
    ? control.getCompilerInfo()
    : {
        backend: 'direct-ts6',
        version: ts.version,
        root: path.dirname(require.resolve('typescript/package.json')),
      };
  report.compiler.classicImplementationSha256 = hash(
    fs.readFileSync(
      direct
        ? require.resolve('typescript')
        : path.join(report.compiler.classicRoot, 'lib/typescript.js'),
    ),
  );
  report.versions = {
    node: process.version,
    parser: JSON.parse(fs.readFileSync(require.resolve('@typescript-eslint/parser/package.json')))
      .version,
  };
  const { initFileStores, sourceFileStore } = await load(
    'packages/analysis/src/file-stores/index.ts',
  );
  const { analyzeProject } = await load('packages/analysis/src/analyzeProject.ts');
  const { Linter } = await load('packages/analysis/src/jsts/linter/linter.ts');
  const { ProgramSelectionArchive } = await load(
    'packages/analysis/src/program-selection/archive.ts',
  );
  const prepared = direct
    ? await legacyRulingInputs(runtimeRoot, config.name, config.corpus, config.sources)
    : (await load('packages/ruling/testProject.ts')).createRulingProject(
        config.name,
        config.corpus,
        config.sources,
      );
  const { baseDir, configuration, input } = prepared;
  report.workloadPreparation = prepared.preparation;
  report.configuration = configuration;
  report.ruleConfigurationHash = hash(JSON.stringify(canonical(input)));
  const archiveFile = outputPath + '.selection.pb.gz';
  const archive = new ProgramSelectionArchive(archiveFile, baseDir, 'record');
  const relative = file => path.relative(baseDir, file).replaceAll('\\', '/');
  const original = Linter.getRulesForFile;
  Linter.getRulesForFile = function (...args) {
    const rules = Reflect.apply(original, this, args);
    report.activeRules[relative(args[0])] = Object.keys(rules).sort();
    return rules;
  };
  const analysisStart = performance.now();
  await initFileStores(configuration);
  report.timings.discoveryMs = performance.now() - analysisStart;
  const projectStart = performance.now();
  const result = await analyzeProject({ ...input, programSelection: archive }, configuration);
  report.timings.projectMs = performance.now() - projectStart;
  report.timings.analysisMs = performance.now() - analysisStart;
  // Production analysis includes its normal cleanup. Everything below is reporting.
  report.compilerRouting = control
    ? assertCompilerRouting(control.getCompilerGateway(), ts)
    : {
        direct: true,
        sameCompiler:
          createRequire(require.resolve('@typescript-eslint/typescript-estree/package.json'))(
            'typescript',
          ) === ts,
        ownedModuleLoaded: Object.keys(require.cache).some(f =>
          /\/packages\/typescript\/(?:index|control|gateway)\.(?:cjs|mjs)$/.test(f),
        ),
      };
  if (direct && (!report.compilerRouting.sameCompiler || report.compilerRouting.ownedModuleLoaded))
    throw new Error('Direct master must use one physical TS6 compiler without the owned facade');
  report.telemetry = result.meta.telemetry;
  report.warnings = result.meta.warnings;
  const sourceFiles = sourceFileStore.getFiles();
  report.files = Object.keys(sourceFiles).map(relative).sort();
  report.sourceHashes = Object.fromEntries(
    Object.entries(sourceFiles).map(([file, value]) => [
      relative(file),
      {
        sha256: hash(value.fileContent ?? fs.readFileSync(file, 'utf8')),
        fileType: value.fileType,
        ruleFileType: value.ruleFileType,
      },
    ]),
  );
  archive.end();
  const recorded = new ProgramSelectionArchive(archiveFile, baseDir, 'replay');
  report.programInputs = recorded
    .getRestoredSelections(Object.keys(sourceFiles))
    .map(selection => ({
      kind: selection.program.kind,
      tsconfig: selection.program.tsconfig ? relative(selection.program.tsconfig) : undefined,
      compilerOptions: serializeCompilerOptions(ts, selection.program.compilerOptions),
      files: selection.requestedFiles.map(relative).sort(),
    }))
    .sort((a, b) => JSON.stringify(canonical(a)).localeCompare(JSON.stringify(canonical(b))));
  report.noProgramFiles = Object.keys(sourceFiles)
    .filter(file => recorded.hasNoProgram(file))
    .map(relative)
    .sort();
  report.resultFiles = Object.keys(result.files).map(relative).sort();
  report.parsingErrors = 0;
  for (const [file, value] of Object.entries(result.files)) {
    const name = relative(file);
    report.diagnostics[name] = {
      ...normalizeDiagnostics(value, baseDir),
      parsingErrors: value.parsingErrors ?? [],
      error: value.error,
    };
    for (const issue of value.issues ?? []) {
      const key = `${issue.language}-${issue.ruleId}`;
      ((report.issues[key] ??= {})[name] ??= []).push(issue.line);
    }
    for (const error of value.parsingErrors ?? []) {
      report.parsingErrors++;
      if (error.code !== 'PARSING') report.errors.push({ file: name, ...error });
    }
    if (value.error) report.errors.push({ file: name, message: value.error });
  }
  for (const files of Object.values(report.issues))
    for (const lines of Object.values(files)) lines.sort((a, b) => a - b);
  report.issueCount = Object.values(report.issues)
    .flatMap(files => Object.values(files))
    .reduce((n, lines) => n + lines.length, 0);
  report.missingResults = report.files.filter(file => !report.resultFiles.includes(file));
  if (report.missingResults.length)
    report.errors.push({ message: 'Selected files have no result', files: report.missingResults });
  if (report.telemetry?.programCreation.failed)
    report.errors.push({
      message: 'Compiler program creation failed',
      counts: report.telemetry.programCreation,
    });
  report.valid = report.errors.length === 0;
} catch (error) {
  report.errors.push({ message: error.message, stack: error.stack });
} finally {
  try {
    control?.clearProgramCache();
    control?.getCompilerGateway().assertHealthy();
  } catch (error) {
    report.errors.push({ message: error.message });
    report.valid = false;
  }
  report.timings.workerBodyMs = performance.now() - started;
  report.memory = process.resourceUsage();
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
}
// An aborted production analysis can leave its progress interval active. The
// diagnostic report and compiler cleanup are complete; do not wait for that timer.
if (!report.valid) process.exit(2);
