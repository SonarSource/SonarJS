import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import {
  initializeCompiler,
  getCompilerGateway,
  getCompilerInfo,
  clearProgramCache,
  compilerOptionsToJson,
} from 'typescript/control';
import { createRulingProject } from '../../packages/ruling/testProject.ts';
import { initFileStores, sourceFileStore } from '../../packages/analysis/src/file-stores/index.ts';
import { analyzeProject } from '../../packages/analysis/src/analyzeProject.ts';
import { Linter } from '../../packages/analysis/src/jsts/linter/linter.ts';
import { ProgramSelectionArchive } from '../../packages/analysis/src/program-selection/archive.ts';
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
try {
  const before = performance.now();
  await initializeCompiler();
  report.timings.compilerInitializationMs = performance.now() - before;
  report.compiler = getCompilerInfo();
  report.versions = {
    node: process.version,
    parser: JSON.parse(fs.readFileSync('node_modules/@typescript-eslint/parser/package.json'))
      .version,
  };
  const { baseDir, configuration, input } = createRulingProject(
    config.name,
    config.corpus,
    config.sources,
  );
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
  report.compilerRouting = assertCompilerRouting(getCompilerGateway(), ts);
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
      compilerOptions: compilerOptionsToJson(selection.program.compilerOptions),
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
    clearProgramCache();
    getCompilerGateway().assertHealthy();
  } catch (error) {
    report.errors.push({ message: error.message });
    report.valid = false;
  }
  report.timings.workerBodyMs = performance.now() - started;
  report.memory = process.resourceUsage();
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
}
if (!report.valid) process.exitCode = 2;
