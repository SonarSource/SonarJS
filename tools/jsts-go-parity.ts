/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { handleAnalyzeProjectRequest } from '../packages/grpc/src/analyze-project-handle-request.js';
import type { AnalyzeProjectProtoRequest } from '../packages/grpc/src/analyze-project-request.js';
import { toAnalyzeProjectUnaryResponse } from '../packages/grpc/src/analyze-project-convert.js';
import { sonarjs as analyzeProjectProto } from '../packages/grpc/src/proto/analyze-project.js';

type AnalyzeProjectUnaryResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectUnaryResponse;
type ProjectAnalysisFileResult = analyzeProjectProto.analyzeproject.v1.IProjectAnalysisFileResult;
type Issue = analyzeProjectProto.analyzeproject.v1.IIssue;
type ParsingError = analyzeProjectProto.analyzeproject.v1.IParsingError;

type NormalizedAnalysisOutput = {
  warnings?: string[];
  files: NormalizedFileResult[];
};

type BatchNormalizedAnalysisOutput = Record<string, NormalizedAnalysisOutput>;

type NormalizedFileResult = {
  filePath: string;
  error?: string;
  parsingErrors?: NormalizedParsingError[];
  issues?: NormalizedIssue[];
};

type NormalizedParsingError = {
  message: string;
  code: string;
  language: string;
  line?: number;
  column?: number;
};

type NormalizedIssue = {
  ruleId: string;
  language: string;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  secondaryLocations?: NormalizedIssueLocation[];
};

type NormalizedIssueLocation = {
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message?: string;
};

type LoadedRequest = {
  request: AnalyzeProjectProtoRequest;
  projectPath?: string;
  requestPath?: string;
  baseDir: string;
};

const currentFile = fileURLToPath(import.meta.url);
const toolsDir = dirname(currentFile);
const repoRoot = resolve(toolsDir, '..');
const parityCorpusRoot = join(repoRoot, 'packages', 'parity', 'corpus');
const goServerDir = join(repoRoot, 'server-go', 'sonar-server');
const { AnalysisLanguage, ParsingErrorCode } = analyzeProjectProto.analyzeproject.v1;

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  switch (command) {
    case 'list':
      await listProjects();
      return;
    case 'run-node':
    case 'run-go':
    case 'diff':
    case 'run-node-all':
    case 'run-go-all':
    case 'diff-all': {
      const options = parseCommonOptions(rest);
      if (command === 'run-node-all') {
        printJSON(await runNodeAll(options), options.pretty);
        return;
      }
      if (command === 'run-go-all') {
        printJSON(await runGoAll(options), options.pretty);
        return;
      }
      if (command === 'diff-all') {
        await diffAll(options);
        return;
      }

      const request = await loadRequest(options);
      if (command === 'run-node') {
        const result = await runNode(request.request);
        printJSON(result, options.pretty);
        return;
      }
      if (command === 'run-go') {
        const result = await runGo(request, options.pretty);
        printJSON(result, options.pretty);
        return;
      }
      await diffNodeAndGo(request, options.pretty);
      return;
    }
    default:
      throw new Error(`Unknown command ${command}`);
  }
}

function parseCommonOptions(args: string[]) {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    options: {
      project: { type: 'string' },
      request: { type: 'string' },
      'base-dir': { type: 'string' },
      pretty: { type: 'boolean', default: true },
    },
  });

  return {
    project: values.project,
    request: values.request,
    baseDir: values['base-dir'],
    pretty: values.pretty,
  };
}

async function listProjects() {
  for (const project of await listProjectNames()) {
    console.log(project);
  }
}

async function loadRequest(options: {
  project?: string;
  request?: string;
  baseDir?: string;
}): Promise<LoadedRequest> {
  const projectPath = await resolveProjectPath(options.project);
  const requestPath = await resolveRequestPath(projectPath, options.request);
  const rawRequest = requestPath ? await readJSON(requestPath) : {};
  if (!isRecord(rawRequest)) {
    throw new Error('Analyze-project request JSON must contain an object');
  }

  let effectiveBaseDir = options.baseDir ? resolvePath(options.baseDir, projectPath) : undefined;
  if (!effectiveBaseDir && projectPath) {
    effectiveBaseDir = projectPath;
  }
  if (!effectiveBaseDir) {
    const rawConfiguration = isRecord(rawRequest.configuration)
      ? rawRequest.configuration
      : undefined;
    if (typeof rawConfiguration?.baseDir === 'string' && rawConfiguration.baseDir.trim() !== '') {
      effectiveBaseDir = resolvePath(
        rawConfiguration.baseDir,
        requestPath ? dirname(requestPath) : projectPath,
      );
    }
  }
  if (!effectiveBaseDir) {
    throw new Error(
      'A base directory is required via --base-dir, --project, or request.configuration.baseDir.',
    );
  }

  const mergedRequest = {
    ...rawRequest,
    configuration: {
      ...(isRecord(rawRequest.configuration) ? rawRequest.configuration : {}),
      baseDir: effectiveBaseDir,
    },
    rules: wrapRuleConfigurations(rawRequest.rules),
    cssRules: wrapRuleConfigurations(rawRequest.cssRules),
  };

  const request = analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.fromObject(
    mergedRequest,
  ) as AnalyzeProjectProtoRequest;

  return {
    request,
    projectPath,
    requestPath,
    baseDir: effectiveBaseDir,
  };
}

function wrapRuleConfigurations(rules: unknown): unknown {
  if (!Array.isArray(rules)) {
    return rules;
  }

  return rules.map(rule => {
    if (!isRecord(rule) || !Array.isArray(rule.configurations)) {
      return rule;
    }

    return {
      ...rule,
      configurations: rule.configurations.map(configuration => toProtoValue(configuration)),
    };
  });
}

function toProtoValue(value: unknown): Record<string, unknown> {
  if (value === null) {
    return { nullValue: 0 };
  }
  if (typeof value === 'number') {
    return { numberValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'boolean') {
    return { boolValue: value };
  }
  if (Array.isArray(value)) {
    return {
      listValue: {
        values: value.map(entry => toProtoValue(entry)),
      },
    };
  }
  if (isRecord(value)) {
    return {
      structValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [key, toProtoValue(entry)]),
        ),
      },
    };
  }
  return { nullValue: 0 };
}

async function runNode(request: AnalyzeProjectProtoRequest): Promise<NormalizedAnalysisOutput> {
  const result = await withNodeAnalysisLogsOnStderr(() =>
    handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      { debugMemory: false },
    ),
  );

  if (result.type !== 'success') {
    throw new Error(`${result.reason}: ${result.error.message}`);
  }
  if (!result.result) {
    throw new Error('Node analyze-project returned no result');
  }

  const unary = toAnalyzeProjectUnaryResponse(result.result.output, result.result.pathMap);
  return normalizeUnaryResponse(unary);
}

async function runGo(request: LoadedRequest, pretty: boolean): Promise<NormalizedAnalysisOutput> {
  const args = ['run', '.', '--format', 'normalized-json'];
  if (request.projectPath) {
    args.push('--project', request.projectPath);
  }
  if (request.requestPath) {
    args.push('--request', request.requestPath);
  }
  if (request.baseDir) {
    args.push('--base-dir', request.baseDir);
  }
  if (!pretty) {
    args.push('--pretty=false');
  }

  const { code, stdout, stderr } = await runProcess('go', args, goServerDir);
  if (code !== 0) {
    throw new Error(stderr.trim() || `go runner exited with code ${code}`);
  }

  return JSON.parse(stdout) as NormalizedAnalysisOutput;
}

async function diffNodeAndGo(request: LoadedRequest, pretty: boolean) {
  const node = await runNode(request.request);
  const go = await runGo(request, pretty);

  const mismatches = collectMismatches(node, go);
  if (mismatches.length === 0) {
    console.log('Node and Go outputs match.');
    return;
  }

  console.error('Node and Go outputs differ:');
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  process.exitCode = 1;
}

async function runNodeAll(options: {
  project?: string;
  request?: string;
  baseDir?: string;
  pretty: boolean;
}): Promise<BatchNormalizedAnalysisOutput> {
  assertBatchCompatibleOptions(options);

  const results: BatchNormalizedAnalysisOutput = {};
  for (const project of await listProjectNames()) {
    const request = await loadRequest({ project });
    results[project] = await runNode(request.request);
  }
  return sortObjectKeys(results);
}

async function runGoAll(options: {
  project?: string;
  request?: string;
  baseDir?: string;
  pretty: boolean;
}): Promise<BatchNormalizedAnalysisOutput> {
  assertBatchCompatibleOptions(options);

  const results: BatchNormalizedAnalysisOutput = {};
  for (const project of await listProjectNames()) {
    const request = await loadRequest({ project });
    results[project] = await runGo(request, options.pretty);
  }
  return sortObjectKeys(results);
}

async function diffAll(options: {
  project?: string;
  request?: string;
  baseDir?: string;
  pretty: boolean;
}) {
  assertBatchCompatibleOptions(options);

  const mismatchedProjects: string[] = [];
  for (const project of await listProjectNames()) {
    const request = await loadRequest({ project });
    const node = await runNode(request.request);
    const go = await runGo(request, options.pretty);
    const mismatches = collectMismatches(node, go);
    if (mismatches.length === 0) {
      console.log(`OK ${project}`);
      continue;
    }

    mismatchedProjects.push(project);
    console.error(`MISMATCH ${project}`);
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
  }

  if (mismatchedProjects.length === 0) {
    console.log('All corpus projects match between Node and Go.');
    return;
  }

  console.error(
    `Found ${mismatchedProjects.length} mismatched project(s): ${mismatchedProjects.join(', ')}`,
  );
  process.exitCode = 1;
}

function collectMismatches(node: NormalizedAnalysisOutput, go: NormalizedAnalysisOutput): string[] {
  const mismatches: string[] = [];

  if (JSON.stringify(node.warnings ?? []) !== JSON.stringify(go.warnings ?? [])) {
    mismatches.push('Warnings differ');
  }

  const nodeFiles = new Map(node.files.map(file => [file.filePath, file]));
  const goFiles = new Map(go.files.map(file => [file.filePath, file]));
  const allPaths = Array.from(new Set([...nodeFiles.keys(), ...goFiles.keys()])).sort((a, b) =>
    a.localeCompare(b),
  );

  for (const filePath of allPaths) {
    const nodeFile = nodeFiles.get(filePath);
    const goFile = goFiles.get(filePath);
    if (!nodeFile || !goFile) {
      mismatches.push(`File presence differs for ${filePath}`);
      continue;
    }
    if (JSON.stringify(nodeFile) !== JSON.stringify(goFile)) {
      const nodeIssues = nodeFile.issues?.length ?? 0;
      const goIssues = goFile.issues?.length ?? 0;
      const nodeParsingErrors = nodeFile.parsingErrors?.length ?? 0;
      const goParsingErrors = goFile.parsingErrors?.length ?? 0;
      mismatches.push(
        `${filePath}: node issues=${nodeIssues}, go issues=${goIssues}, node parsingErrors=${nodeParsingErrors}, go parsingErrors=${goParsingErrors}`,
      );
    }
  }

  return mismatches;
}

function normalizeUnaryResponse(response: AnalyzeProjectUnaryResponse): NormalizedAnalysisOutput {
  const files = Object.entries(response.files ?? {})
    .map(([filePath, result]) => normalizeFileResult(filePath, result))
    .sort((left, right) => left.filePath.localeCompare(right.filePath));
  const warnings = [...(response.meta?.warnings ?? [])];

  return {
    warnings: warnings.length > 0 ? warnings : undefined,
    files,
  };
}

function normalizeFileResult(
  filePath: string,
  result: ProjectAnalysisFileResult,
): NormalizedFileResult {
  const parsingErrors = (result.parsingErrors ?? [])
    .map(normalizeParsingError)
    .sort(compareNormalizedParsingErrors);
  const issues = (result.issues ?? []).map(normalizeIssue).sort(compareNormalizedIssues);

  return {
    filePath,
    error: result.error ?? undefined,
    parsingErrors: parsingErrors.length > 0 ? parsingErrors : undefined,
    issues: issues.length > 0 ? issues : undefined,
  };
}

function normalizeParsingError(error: ParsingError): NormalizedParsingError {
  return {
    message: error.message ?? '',
    code: normalizeParsingErrorCode(error.code),
    language: normalizeAnalysisLanguage(error.language),
    line: error.line ?? undefined,
    column: error.column ?? undefined,
  };
}

function normalizeIssue(issue: Issue): NormalizedIssue {
  return {
    ruleId: issue.ruleId ?? '',
    language: normalizeAnalysisLanguage(issue.language),
    message: issue.message ?? '',
    line: issue.line ?? 0,
    column: issue.column ?? 0,
    endLine: issue.endLine ?? undefined,
    endColumn: issue.endColumn ?? undefined,
    secondaryLocations: normalizeSecondaryLocations(issue.secondaryLocations),
  };
}

function normalizeSecondaryLocations(
  locations: analyzeProjectProto.analyzeproject.v1.IIssueLocation[] | null | undefined,
): NormalizedIssueLocation[] | undefined {
  if (!locations || locations.length === 0) {
    return undefined;
  }
  return locations.map(location => ({
    line: location.line ?? undefined,
    column: location.column ?? undefined,
    endLine: location.endLine ?? undefined,
    endColumn: location.endColumn ?? undefined,
    message: location.message ?? undefined,
  }));
}

function compareNormalizedParsingErrors(
  left: NormalizedParsingError,
  right: NormalizedParsingError,
): number {
  return (
    left.code.localeCompare(right.code) ||
    compareOptionalNumber(left.line, right.line) ||
    compareOptionalNumber(left.column, right.column) ||
    left.language.localeCompare(right.language) ||
    left.message.localeCompare(right.message)
  );
}

function compareNormalizedIssues(left: NormalizedIssue, right: NormalizedIssue): number {
  return (
    left.ruleId.localeCompare(right.ruleId) ||
    compareOptionalNumber(left.line, right.line) ||
    compareOptionalNumber(left.column, right.column) ||
    compareOptionalNumber(left.endLine, right.endLine) ||
    compareOptionalNumber(left.endColumn, right.endColumn) ||
    left.language.localeCompare(right.language) ||
    left.message.localeCompare(right.message)
  );
}

function compareOptionalNumber(left?: number, right?: number): number {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  return left - right;
}

function normalizeAnalysisLanguage(
  language: analyzeProjectProto.analyzeproject.v1.AnalysisLanguage | null | undefined,
): string {
  switch (language) {
    case AnalysisLanguage.ANALYSIS_LANGUAGE_JS:
      return 'js';
    case AnalysisLanguage.ANALYSIS_LANGUAGE_TS:
      return 'ts';
    case AnalysisLanguage.ANALYSIS_LANGUAGE_CSS:
      return 'css';
    default:
      return 'ANALYSIS_LANGUAGE_UNSPECIFIED';
  }
}

function normalizeParsingErrorCode(
  code: analyzeProjectProto.analyzeproject.v1.ParsingErrorCode | null | undefined,
): string {
  switch (code) {
    case ParsingErrorCode.PARSING_ERROR_CODE_PARSING:
      return 'PARSING';
    case ParsingErrorCode.PARSING_ERROR_CODE_FAILING_TYPESCRIPT:
      return 'FAILING_TYPESCRIPT';
    case ParsingErrorCode.PARSING_ERROR_CODE_LINTER_INITIALIZATION:
      return 'LINTER_INITIALIZATION';
    default:
      return 'UNSPECIFIED';
  }
}

async function resolveProjectPath(project?: string): Promise<string | undefined> {
  if (!project) {
    return undefined;
  }

  const directPath = resolve(project);
  if (await isDirectory(directPath)) {
    return directPath;
  }

  const corpusPath = join(parityCorpusRoot, project);
  if (await isDirectory(corpusPath)) {
    return corpusPath;
  }

  throw new Error(`Project ${project} was not found as a directory or corpus entry.`);
}

async function listProjectNames(): Promise<string[]> {
  const entries = await readdir(parityCorpusRoot, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function resolveRequestPath(
  projectPath: string | undefined,
  requestPath: string | undefined,
): Promise<string | undefined> {
  if (requestPath) {
    return resolvePath(requestPath, projectPath);
  }
  if (!projectPath) {
    return undefined;
  }

  const defaultRequest = join(projectPath, 'request.json');
  return (await isFile(defaultRequest)) ? defaultRequest : undefined;
}

function resolvePath(target: string, basePath?: string): string {
  if (isAbsolute(target)) {
    return resolve(target);
  }
  if (basePath) {
    return resolve(basePath, target);
  }
  return resolve(target);
}

function assertBatchCompatibleOptions(options: {
  project?: string;
  request?: string;
  baseDir?: string;
}) {
  if (options.project || options.request || options.baseDir) {
    throw new Error('Batch commands do not accept --project, --request, or --base-dir.');
  }
}

function sortObjectKeys<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function readJSON(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function printJSON(value: unknown, pretty: boolean) {
  console.log(JSON.stringify(value, null, pretty ? 2 : 0));
}

async function withNodeAnalysisLogsOnStderr<T>(run: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    console.error(...args);
  };
  try {
    return await run();
  } finally {
    console.log = originalLog;
  }
}

async function runProcess(command: string, args: string[], cwd: string) {
  return await new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolvePromise, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', code => {
        resolvePromise({ code, stdout, stderr });
      });
    },
  );
}

function printUsage() {
  console.log(`Usage:
  tsx tools/jsts-go-parity.ts list
  tsx tools/jsts-go-parity.ts run-node --project <name-or-path>
  tsx tools/jsts-go-parity.ts run-go --project <name-or-path>
  tsx tools/jsts-go-parity.ts diff --project <name-or-path>
  tsx tools/jsts-go-parity.ts run-node-all
  tsx tools/jsts-go-parity.ts run-go-all
  tsx tools/jsts-go-parity.ts diff-all

Common options:
  --project   Synthetic parity project directory or corpus entry name
  --request   AnalyzeProjectRequest JSON file
  --base-dir  Override request.configuration.baseDir
  --pretty    Pretty-print JSON output (default: true)
`);
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
