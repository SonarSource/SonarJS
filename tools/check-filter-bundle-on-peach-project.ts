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
import { spawnSync } from 'node:child_process';
import { glob } from 'glob';
import { minimatch } from 'minimatch';

const PEACH_ROOT = process.env.PEACHEE_JS_ROOT
  ? path.resolve(process.env.PEACHEE_JS_ROOT)
  : path.resolve(process.env.HOME ?? '~', 'git/peachee-js');
const DEFAULT_INCLUSIONS = [
  '**/*.js',
  '**/*.jsx',
  '**/*.mjs',
  '**/*.cjs',
  '**/*.ts',
  '**/*.tsx',
  '**/*.vue',
];
const DEFAULT_EXCLUSIONS = ['**/node_modules/**/*'];
const TSX_IMPORT_PATH = path.resolve(import.meta.dirname, '../node_modules/tsx/dist/esm/index.mjs');

type SonarProperties = Map<string, string>;

function printUsage() {
  console.error(
    'Usage: node --import tsx/esm tools/check-filter-bundle-on-peach-project.ts <peach-subfolder>',
  );
  console.error('');
  console.error(
    'Example: node --import tsx/esm tools/check-filter-bundle-on-peach-project.ts react-native',
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

function trimWorkspacePrefix(relativePath: string) {
  return relativePath.startsWith('workspace/')
    ? relativePath.slice('workspace/'.length)
    : relativePath;
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

function fileSuffixPatterns(properties: SonarProperties) {
  const jsSuffixes = splitCsv(properties.get('sonar.javascript.file.suffixes'));
  const tsSuffixes = splitCsv(properties.get('sonar.typescript.file.suffixes'));
  const suffixes = [...jsSuffixes, ...tsSuffixes];
  if (suffixes.length === 0) {
    return DEFAULT_INCLUSIONS;
  }

  return suffixes.map(suffix => `**/*${suffix}`);
}

async function listFilesUnderSources(projectDir: string, sourceEntries: string[]) {
  const files = new Set<string>();

  for (const sourceEntry of sourceEntries) {
    const sourceDir = path.resolve(projectDir, sourceEntry);
    const matches = await glob('**/*', {
      cwd: sourceDir,
      absolute: true,
      nodir: true,
      dot: true,
      follow: false,
    }).catch(() => []);

    for (const match of matches) {
      files.add(path.resolve(match));
    }
  }

  return [...files];
}

function matchesAny(filePath: string, patterns: string[]) {
  return patterns.some(pattern => minimatch(filePath, pattern, { dot: true }));
}

async function buildCandidateFileList(projectDir: string, properties: SonarProperties) {
  const configuredSources = splitCsv(properties.get('sonar.sources'));
  const sourceEntries = configuredSources.length > 0 ? configuredSources : ['.'];

  const inclusions = splitCsv(properties.get('sonar.inclusions'));
  const testInclusions = splitCsv(properties.get('sonar.test.inclusions'));
  const effectiveInclusions = inclusions.length > 0 ? inclusions : fileSuffixPatterns(properties);

  const files = await listFilesUnderSources(projectDir, sourceEntries);
  return files
    .map(filePath => path.relative(projectDir, filePath))
    .map(toPosixPath)
    .filter(relativePath => matchesAny(relativePath, effectiveInclusions))
    .filter(relativePath => !matchesAny(relativePath, testInclusions))
    .sort((left, right) => left.localeCompare(right));
}

async function writeTemporaryFiles(projectDir: string, projectName: string, fileList: string[]) {
  const tmpDir = await fs.mkdtemp(path.join(projectDir, '.filter-bundle-'));
  const listPath = path.join(tmpDir, `${projectName}-source-files.txt`);
  const generatedPath = path.join(tmpDir, `${projectName}-generated-files.txt`);
  const notExcludedPath = path.join(
    tmpDir,
    `${projectName}-generated-files-not-already-excluded.txt`,
  );
  await fs.writeFile(listPath, fileList.join('\n') + '\n', 'utf8');
  return { tmpDir, listPath, generatedPath, notExcludedPath };
}

async function runFilterBundleScript(projectDir: string, listPath: string, generatedPath: string) {
  const result = spawnSync(
    'node',
    [
      '--import',
      TSX_IMPORT_PATH,
      path.resolve(import.meta.dirname, 'check-filter-bundle.ts'),
      listPath,
    ],
    {
      cwd: projectDir,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'check-filter-bundle.ts failed');
  }

  const generatedFiles = result.stdout
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(
      line =>
        !line.startsWith('DEBUG ') &&
        !line.startsWith('Some of the project files were automatically excluded'),
    );

  await fs.writeFile(
    generatedPath,
    generatedFiles.map(trimWorkspacePrefix).join('\n') + (generatedFiles.length ? '\n' : ''),
    'utf8',
  );

  return generatedFiles;
}

async function writeNotAlreadyExcludedFile(
  generatedFiles: string[],
  notExcludedPath: string,
  exclusions: string[],
) {
  const relevantExclusions = [...DEFAULT_EXCLUSIONS, ...exclusions];
  const notAlreadyExcluded = generatedFiles.filter(
    relativePath => !matchesAny(relativePath, relevantExclusions),
  );

  await fs.writeFile(
    notExcludedPath,
    notAlreadyExcluded.map(trimWorkspacePrefix).join('\n') +
      (notAlreadyExcluded.length ? '\n' : ''),
    'utf8',
  );
}

async function main() {
  const subfolder = process.argv[2];
  if (!subfolder || process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(subfolder ? 0 : 1);
  }

  const projectDir = path.resolve(PEACH_ROOT, subfolder);
  const projectName = path.basename(projectDir);
  try {
    await fs.access(projectDir);
  } catch {
    throw new Error(`Peach project directory not found: ${projectDir}`);
  }
  const properties = await readSonarProperties(projectDir);
  const fileList = await buildCandidateFileList(projectDir, properties);
  const exclusions = splitCsv(properties.get('sonar.exclusions'));
  const { tmpDir, listPath, generatedPath, notExcludedPath } = await writeTemporaryFiles(
    projectDir,
    projectName,
    fileList,
  );
  const generatedFiles = await runFilterBundleScript(projectDir, listPath, generatedPath);
  await writeNotAlreadyExcludedFile(generatedFiles, notExcludedPath, exclusions);

  console.log(`Temporary directory: ${tmpDir}`);
  console.log(`Source file list:    ${listPath}`);
  console.log(`Generated files:     ${generatedPath}`);
  console.log(`Not yet excluded:    ${notExcludedPath}`);
  console.log(`Matched files:       ${fileList.length}`);
}

await main();
