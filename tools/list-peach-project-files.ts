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
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'glob';
import {
  classifyProjectFiles,
  type SonarProperties,
} from '../packages/analysis/src/common/project-file-scope.js';

const PEACH_ROOT = process.env.PEACHEE_JS_ROOT
  ? path.resolve(process.env.PEACHEE_JS_ROOT)
  : path.resolve(process.env.HOME ?? '~', 'git/peachee-js');

type ListKind = 'source' | 'test' | 'both';
type OutputFormat = 'paths' | 'json' | 'summary';

interface ParsedArguments {
  allProjects: boolean;
  format: OutputFormat;
  listKind: ListKind;
  onlyDetectBundlesEnabled: boolean;
  projectSubfolder?: string;
}

interface ProjectScope {
  detectBundles: boolean;
  detectGeneratedCode: boolean;
  projectBaseDir: string;
  projectId: string;
  properties: SonarProperties;
  skipped: boolean;
  sourceFiles: string[];
  testFiles: string[];
}

function printUsage() {
  console.error(
    'Usage: node --import tsx/esm tools/list-peach-project-files.ts [--list source|test|both] [--all] [--format paths|json|summary] <peach-subfolder>',
  );
  console.error('');
  console.error('Example: node --import tsx/esm tools/list-peach-project-files.ts react-native');
  console.error(
    'Example: node --import tsx/esm tools/list-peach-project-files.ts --list both --all --format summary',
  );
  console.error(
    'Example: node --import tsx/esm tools/list-peach-project-files.ts --all --only-detect-bundles-enabled --format json',
  );
  console.error(`Peach root: ${PEACH_ROOT}`);
  console.error('Override with PEACHEE_JS_ROOT=/path/to/peachee-js if needed.');
}

function splitCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join(path.posix.sep);
}

async function readSonarProperties(projectDir: string): Promise<SonarProperties> {
  const propertiesPath = path.join(projectDir, 'sonar-project.properties');
  const content = await fs.readFile(propertiesPath, 'utf8');
  const properties = new Map<string, string>();

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.search(/[=:]/u);
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    properties.set(key, value);
  }

  return properties;
}

async function resolveProjectBaseDir(projectDir: string) {
  const workspaceDir = path.join(projectDir, 'workspace');
  try {
    const stat = await fs.stat(workspaceDir);
    if (stat.isDirectory()) {
      return workspaceDir;
    }
  } catch {
    // Fall back to the project directory when Peach does not provide a workspace wrapper.
  }

  return projectDir;
}

function isDetectBundlesEnabled(properties: SonarProperties) {
  return properties.get('sonar.javascript.detectBundles')?.toLowerCase() !== 'false';
}

function isDetectGeneratedCodeEnabled(properties: SonarProperties) {
  const rawDetectGeneratedCode = properties.get('sonar.javascript.detectGeneratedCode');
  if (rawDetectGeneratedCode !== undefined) {
    return rawDetectGeneratedCode.toLowerCase() !== 'false';
  }
  return isDetectBundlesEnabled(properties);
}

export function parseCommandLine(arguments_: string[]): ParsedArguments {
  const parsed: ParsedArguments = {
    allProjects: false,
    format: 'paths',
    listKind: 'source',
    onlyDetectBundlesEnabled: false,
  };

  const positionalArguments: string[] = [];

  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === '--list') {
      const listKind = arguments_[++index];
      if (listKind !== 'source' && listKind !== 'test' && listKind !== 'both') {
        throw new Error(`Invalid value for --list: ${listKind ?? '(missing)'}`);
      }
      parsed.listKind = listKind;
      continue;
    }

    if (argument === '--all') {
      parsed.allProjects = true;
      continue;
    }

    if (argument === '--format') {
      const format = arguments_[++index];
      if (format !== 'paths' && format !== 'json' && format !== 'summary') {
        throw new Error(`Invalid value for --format: ${format ?? '(missing)'}`);
      }
      parsed.format = format;
      continue;
    }

    if (argument === '--only-detect-bundles-enabled') {
      parsed.onlyDetectBundlesEnabled = true;
      continue;
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    }

    positionalArguments.push(argument);
  }

  if (positionalArguments.length > 1) {
    throw new Error(`Unexpected positional arguments: ${positionalArguments.slice(1).join(', ')}`);
  }

  parsed.projectSubfolder = positionalArguments[0];

  if (parsed.allProjects === Boolean(parsed.projectSubfolder)) {
    throw new Error('Listing requires exactly one of <peach-subfolder> or --all');
  }

  if (parsed.onlyDetectBundlesEnabled && !parsed.allProjects) {
    throw new Error('--only-detect-bundles-enabled is only supported with --all');
  }

  return parsed;
}

export async function getProjectSubfolders() {
  return (
    await glob('**/sonar-project.properties', {
      absolute: false,
      cwd: PEACH_ROOT,
      nodir: true,
    })
  )
    .map(propertiesPath => toPosixPath(path.posix.dirname(propertiesPath)))
    .sort((left, right) => left.localeCompare(right));
}

export async function loadProjectScopes(subfolders: string[]) {
  const scopes: ProjectScope[] = [];
  for (const subfolder of subfolders) {
    scopes.push(await loadProjectScope(subfolder));
  }
  return scopes;
}

export async function loadProjectScope(subfolder: string): Promise<ProjectScope> {
  const projectDir = path.resolve(PEACH_ROOT, subfolder);
  const projectId = toPosixPath(path.relative(PEACH_ROOT, projectDir));
  try {
    await fs.access(projectDir);
  } catch {
    throw new Error(`Peach project directory not found: ${projectDir}`);
  }

  const projectBaseDir = await resolveProjectBaseDir(projectDir);
  const properties = await readSonarProperties(projectDir);
  const { sourceFiles, testFiles } = await classifyProjectFiles(projectBaseDir, properties);
  const detectBundles = isDetectBundlesEnabled(properties);
  const detectGeneratedCode = isDetectGeneratedCodeEnabled(properties);

  return {
    detectBundles,
    detectGeneratedCode,
    projectBaseDir,
    projectId,
    properties,
    skipped: false,
    sourceFiles,
    testFiles,
  };
}

function listFilesForKind(scope: ProjectScope, kind: ListKind) {
  if (kind === 'source') {
    return [{ kind, files: scope.sourceFiles }];
  }
  if (kind === 'test') {
    return [{ kind, files: scope.testFiles }];
  }
  return [
    { kind: 'source' as const, files: scope.sourceFiles },
    { kind: 'test' as const, files: scope.testFiles },
  ];
}

function formatPathsOutput(scopes: ProjectScope[], listKind: ListKind) {
  const lines: string[] = [];
  const visibleScopes = scopes.filter(scope => !scope.skipped);

  for (const scope of visibleScopes) {
    const fileGroups = listFilesForKind(scope, listKind);
    for (const group of fileGroups) {
      for (const filePath of group.files) {
        if (visibleScopes.length === 1 && listKind !== 'both') {
          lines.push(filePath);
        } else if (visibleScopes.length === 1) {
          lines.push(`${group.kind}\t${filePath}`);
        } else if (listKind === 'both') {
          lines.push(`${scope.projectId}\t${group.kind}\t${filePath}`);
        } else {
          lines.push(`${scope.projectId}\t${filePath}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function formatSummaryOutput(scopes: ProjectScope[], listKind: ListKind) {
  return scopes
    .map(scope => {
      const sourceEntries = splitCsv(scope.properties.get('sonar.sources'));
      const testEntries = splitCsv(scope.properties.get('sonar.tests'));
      const lines = [
        `Project:          ${scope.projectId}`,
        `Project base dir: ${scope.projectBaseDir}`,
        `List kind:        ${listKind}`,
        `Detect bundles:   ${scope.detectBundles}`,
        `Detect gen code:  ${scope.detectGeneratedCode}`,
        `Skipped:          ${scope.skipped}`,
        `Source entries:   ${sourceEntries.length > 0 ? sourceEntries.join(', ') : '(default: .)'}`,
        `Test entries:     ${testEntries.length > 0 ? testEntries.join(', ') : '(none)'}`,
        `Source files:     ${scope.sourceFiles.length}`,
        `Test files:       ${scope.testFiles.length}`,
      ];
      return lines.join('\n');
    })
    .join('\n\n');
}

function formatJsonOutput(scopes: ProjectScope[], listKind: ListKind) {
  const payload = scopes.map(scope => ({
    listKind,
    project: scope.projectId,
    projectBaseDir: scope.projectBaseDir,
    detectBundles: scope.detectBundles,
    detectGeneratedCode: scope.detectGeneratedCode,
    sonarExclusions: splitCsv(scope.properties.get('sonar.exclusions')),
    sonarInclusions: splitCsv(scope.properties.get('sonar.inclusions')),
    sonarSources: splitCsv(scope.properties.get('sonar.sources')),
    sonarTestExclusions: splitCsv(scope.properties.get('sonar.test.exclusions')),
    sonarTestInclusions: splitCsv(scope.properties.get('sonar.test.inclusions')),
    sonarTests: splitCsv(scope.properties.get('sonar.tests')),
    skipped: scope.skipped,
    sourceFiles: scope.sourceFiles,
    testFiles: scope.testFiles,
  }));

  return JSON.stringify(scopes.length === 1 ? payload[0] : payload, null, 2);
}

function printListOutput(scopes: ProjectScope[], listKind: ListKind, format: OutputFormat) {
  if (format === 'summary') {
    console.log(formatSummaryOutput(scopes, listKind));
    return;
  }

  if (format === 'json') {
    console.log(formatJsonOutput(scopes, listKind));
    return;
  }

  const output = formatPathsOutput(scopes, listKind);
  if (output.length > 0) {
    console.log(output);
  }
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes('--help') || arguments_.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const parsed = parseCommandLine(arguments_);
  const subfolders = parsed.allProjects
    ? await getProjectSubfolders()
    : [parsed.projectSubfolder as string];
  const scopes = await loadProjectScopes(subfolders);
  const filteredScopes = parsed.onlyDetectBundlesEnabled
    ? scopes.map(scope => ({
        ...scope,
        skipped: !scope.detectBundles,
      }))
    : scopes;
  printListOutput(filteredScopes, parsed.listKind, parsed.format);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
