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
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path/posix';
import ts from 'typescript';
import yaml from 'yaml';
import { type NormalizedAbsolutePath } from '../../../../../../../shared/src/helpers/files.js';
import { type GeneratedSourceDetector } from '../contracts.js';
import {
  hasToolEvidence,
  resolveConfigPaths,
  resolveGeneratedOutputsFromLiteralPaths,
  type ResolvedGeneratedOutputs,
} from '../detector-api.js';
import { taskInvocationInvokesCommand, type TaskInvocation } from '../task-invocations.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  isLiteralPathToken,
  resolveLiteralPath,
  safeStat,
} from '../shared.js';

const AUTO_DISCOVERED_GRAPHQL_CONFIGS = [
  'package.json',
  '.graphqlrc',
  '.graphqlrc.cjs',
  '.graphqlrc.js',
  '.graphqlrc.json',
  '.graphqlrc.toml',
  '.graphqlrc.ts',
  '.graphqlrc.yaml',
  '.graphqlrc.yml',
  'graphql.config.cjs',
  'graphql.config.cts',
  'graphql.config.js',
  'graphql.config.json',
  'graphql.config.mjs',
  'graphql.config.mts',
  'graphql.config.toml',
  'graphql.config.ts',
  'graphql.config.yaml',
  'graphql.config.yml',
  '.codegenrc.js',
  '.codegenrc.json',
  '.codegenrc.ts',
  '.codegenrc.yaml',
  '.codegenrc.yml',
  'codegen.cts',
  'codegen.yml',
  'codegen.yaml',
  'codegen.json',
  'codegen.mts',
  'codegen.ts',
  'codegen.js',
] as const;
// These config names work when passed explicitly via --config / -c, but they are not
// part of GraphQL Codegen's implicit fallback search.
const EXPLICIT_GRAPHQL_CONFIGS = [
  'codegen.config.cjs',
  'codegen.config.cts',
  'codegen.config.js',
  'codegen.config.mjs',
  'codegen.config.mts',
  'codegen.config.ts',
] as const;
const WATCHED_GRAPHQL_CONFIGS = [
  ...AUTO_DISCOVERED_GRAPHQL_CONFIGS,
  ...EXPLICIT_GRAPHQL_CONFIGS,
] as const;
const GRAPHQL_CONFIG_FLAGS = ['--config', '-c'];
const DEFAULT_NEAR_OPERATION_FILE_EXTENSION = '.generated.ts';
const GRAPHQL_GENERATED_DIRECTORY_SEGMENTS = new Set(['generated', '__generated__', 'gql']);
const GRAPHQL_CODEGEN_FAMILY = '@graphql-codegen/cli';
const TOML_TABLE_PATH_PATTERN = /^\[([^\]]+)\]$/u;
const SUPPORTED_TOML_GENERATES_INDEXES = [2, 4] as const;
const TOP_LEVEL_TOML_CODEGEN_PREFIX = ['extensions', 'codegen'] as const;
const PROJECT_TOML_CODEGEN_PREFIX_LENGTH = 4;

type GraphqlGenerateTarget = {
  outputPath: string;
  preset?: string;
  generatedFileExtension?: string;
};

type GraphqlTomlGenerateTargetContext = {
  outputPath: string;
  nestedPath: string[];
};

type GraphqlTomlAssignment = {
  key: string;
  value: string;
};

type ParsedTomlQuotedSegment = {
  segment: string;
  nextIndex: number;
};

export const graphqlCodegenDetector = {
  family: GRAPHQL_CODEGEN_FAMILY,
  watchedFilenames: WATCHED_GRAPHQL_CONFIGS,

  async detect({ baseDir, packageDir, getDependencies, taskInvocations, sourceFileMatcher }) {
    const matchesTaskInvocation = (taskInvocation: TaskInvocation) =>
      taskInvocationInvokesCommand(taskInvocation, 'graphql-codegen');
    const configPaths = await filterGraphqlConfigPaths(
      await resolveConfigPaths({
        baseDir,
        packageDir,
        taskInvocations,
        matchesTaskInvocation,
        flags: GRAPHQL_CONFIG_FLAGS,
        fallbackBasenames: AUTO_DISCOVERED_GRAPHQL_CONFIGS,
      }),
    );
    if (configPaths.size === 0) {
      return createDerivedGeneratedSources();
    }

    if (
      !hasToolEvidence({
        getDependencies,
        taskInvocations,
        dependencyName: GRAPHQL_CODEGEN_FAMILY,
        matchesTaskInvocation,
      })
    ) {
      return createDerivedGeneratedSources();
    }

    const derived = createDerivedGeneratedSources();
    for (const configPath of [...configPaths].sort((left, right) => left.localeCompare(right))) {
      derived.configPaths.add(configPath);
      const resolvedOutputs = await resolveGraphqlOutputs(
        baseDir,
        packageDir,
        configPath,
        sourceFileMatcher,
      );
      addFamilyFiles(GRAPHQL_CODEGEN_FAMILY, resolvedOutputs.filePaths, derived);
      for (const watchedOutputPath of resolvedOutputs.watchedOutputPaths) {
        derived.watchedOutputPaths.add(watchedOutputPath);
      }
    }

    return derived;
  },
} satisfies GeneratedSourceDetector;

async function filterGraphqlConfigPaths(configPaths: Set<NormalizedAbsolutePath>) {
  const filteredConfigPaths = new Set<NormalizedAbsolutePath>();

  for (const configPath of configPaths) {
    if (
      basename(configPath).toLowerCase() !== 'package.json' ||
      (await parseGraphqlGenerates(configPath)).length > 0
    ) {
      filteredConfigPaths.add(configPath);
    }
  }

  return filteredConfigPaths;
}

async function resolveGraphqlOutputs(
  baseDir: NormalizedAbsolutePath,
  packageDir: NormalizedAbsolutePath,
  configPath: NormalizedAbsolutePath,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
): Promise<ResolvedGeneratedOutputs> {
  const generateTargets = await parseGraphqlGenerates(configPath);
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set(),
    outputDirectories: new Set(),
    watchedOutputPaths: new Set(),
  };

  for (const generateTarget of [...generateTargets].sort((left, right) =>
    left.outputPath.localeCompare(right.outputPath),
  )) {
    mergeResolvedGeneratedOutputs(
      resolvedOutputs,
      await resolveGraphqlGenerateTargetOutputs(
        baseDir,
        packageDir,
        generateTarget,
        sourceFileMatcher,
      ),
    );
  }

  return resolvedOutputs;
}

async function parseGraphqlGenerates(configPath: NormalizedAbsolutePath) {
  try {
    const configContents = await readFile(configPath, 'utf8');
    const configBasename = basename(configPath).toLowerCase();
    const configExtension = extname(configPath).toLowerCase();

    if (configBasename === 'package.json') {
      return getGenerateTargetsFromPackageJson(JSON.parse(configContents) as unknown);
    }

    if (configBasename === '.graphqlrc') {
      return getGenerateTargetsFromObject(yaml.parse(configContents));
    }

    if (configExtension === '.yml' || configExtension === '.yaml') {
      return getGenerateTargetsFromObject(yaml.parse(configContents));
    }

    if (configExtension === '.toml') {
      return getGenerateTargetsFromToml(configContents);
    }

    if (configExtension === '.json') {
      return getGenerateTargetsFromObject(JSON.parse(configContents) as unknown);
    }

    if (
      configExtension === '.ts' ||
      configExtension === '.js' ||
      configExtension === '.mts' ||
      configExtension === '.cts' ||
      configExtension === '.mjs' ||
      configExtension === '.cjs'
    ) {
      return getGenerateTargetsFromSource(configContents, configPath);
    }
  } catch {
    // Broken or unreadable GraphQL config files should not abort the whole analysis.
    return [];
  }

  return [];
}

function getGenerateTargetsFromObject(config: unknown) {
  return collectGenerateTargets([
    getGenerateTargetsFromGeneratesRecord(getNestedValue(config, ['generates'])),
    ...getGenerateTargetsFromGraphqlConfigObject(config),
  ]);
}

function getGenerateTargetsFromPackageJson(config: unknown) {
  return collectGenerateTargets([
    getGenerateTargetsFromGeneratesRecord(getNestedValue(config, ['codegen', 'generates'])),
    ...getGenerateTargetsFromGraphqlConfigObject(getNestedValue(config, ['graphql'])),
  ]);
}

function getGenerateTargetsFromGeneratesRecord(generates: unknown) {
  if (!isRecord(generates)) {
    return [];
  }

  return Object.entries(generates).flatMap(([outputPath, generateConfig]) => {
    return isLiteralPathToken(outputPath)
      ? [createGraphqlGenerateTarget(outputPath, generateConfig)]
      : [];
  });
}

function getGenerateTargetsFromToml(configContents: string) {
  const generateTargets = new Map<string, GraphqlGenerateTarget>();
  let currentGenerateTarget: GraphqlGenerateTarget | undefined;
  let currentGenerateTargetPath: string[] = [];

  for (const rawLine of configContents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const tablePathMatch = TOML_TABLE_PATH_PATTERN.exec(line);
    if (tablePathMatch) {
      currentGenerateTarget = undefined;
      currentGenerateTargetPath = [];
      const tableContext = getTomlGenerateTargetContext(tablePathMatch[1]);
      if (tableContext && isLiteralPathToken(tableContext.outputPath)) {
        currentGenerateTarget = generateTargets.get(tableContext.outputPath) ?? {
          outputPath: tableContext.outputPath,
        };
        generateTargets.set(tableContext.outputPath, currentGenerateTarget);
        currentGenerateTargetPath = tableContext.nestedPath;
      }
      continue;
    }

    if (!currentGenerateTarget) {
      continue;
    }

    const assignment = parseTomlAssignment(line);
    if (!assignment) {
      continue;
    }

    const parsedValue = parseTomlStringLiteral(assignment.value);
    if (!parsedValue) {
      continue;
    }

    applyTomlGenerateTargetAssignment(
      currentGenerateTarget,
      currentGenerateTargetPath,
      assignment.key,
      parsedValue,
    );
  }

  return [...generateTargets.values()];
}

function getTomlGenerateTargetContext(
  tablePath: string,
): GraphqlTomlGenerateTargetContext | undefined {
  const pathSegments = splitTomlPath(tablePath);
  const generatesIndex = SUPPORTED_TOML_GENERATES_INDEXES.find(
    index =>
      pathSegments[index] === 'generates' &&
      isSupportedTomlGenerateTargetPrefix(pathSegments.slice(0, index)),
  );
  if (generatesIndex === undefined || generatesIndex === pathSegments.length - 1) {
    return undefined;
  }

  return {
    outputPath: pathSegments[generatesIndex + 1],
    nestedPath: pathSegments.slice(generatesIndex + 2),
  };
}

function isSupportedTomlGenerateTargetPrefix(pathSegments: string[]) {
  return (
    matchesTomlPathPrefix(pathSegments, TOP_LEVEL_TOML_CODEGEN_PREFIX) ||
    isProjectTomlGenerateTargetPrefix(pathSegments)
  );
}

function matchesTomlPathPrefix(pathSegments: string[], prefix: readonly string[]) {
  return (
    pathSegments.length === prefix.length &&
    prefix.every((segment, index) => pathSegments[index] === segment)
  );
}

function isProjectTomlGenerateTargetPrefix(pathSegments: string[]) {
  const [projectsSegment, , extensionsSegment, codegenSegment] = pathSegments;
  return (
    pathSegments.length === PROJECT_TOML_CODEGEN_PREFIX_LENGTH &&
    projectsSegment === 'projects' &&
    extensionsSegment === 'extensions' &&
    codegenSegment === 'codegen'
  );
}

function applyTomlGenerateTargetAssignment(
  generateTarget: GraphqlGenerateTarget,
  nestedPath: string[],
  key: string,
  value: string,
) {
  if (nestedPath.length === 0 && key === 'preset') {
    generateTarget.preset = value;
  }

  if (
    (nestedPath.length === 0 && key === 'presetConfig.extension') ||
    (nestedPath.length === 1 && nestedPath[0] === 'presetConfig' && key === 'extension')
  ) {
    generateTarget.generatedFileExtension = value;
  }
}

function splitTomlPath(value: string) {
  const segments: string[] = [];
  let current = '';
  let index = 0;

  while (index < value.length) {
    const char = value[index];

    if (char === '"' || char === "'") {
      const parsedQuotedSegment = parseQuotedTomlPathSegment(value, index);
      current += parsedQuotedSegment.segment;
      index = parsedQuotedSegment.nextIndex;
      continue;
    }

    if (char === '.') {
      appendTomlPathSegment(segments, current);
      current = '';
      index++;
      continue;
    }

    if (!isTomlPathWhitespace(char)) {
      current += char;
    }

    index++;
  }

  appendTomlPathSegment(segments, current);

  return segments;
}

function parseQuotedTomlPathSegment(value: string, startIndex: number): ParsedTomlQuotedSegment {
  const quote = value[startIndex] as '"' | "'";
  let segment = '';
  let index = startIndex + 1;

  while (index < value.length) {
    const char = value[index];

    if (quote === '"' && char === '\\') {
      index++;
      if (index >= value.length) {
        return { segment, nextIndex: index };
      }
      segment += value[index];
      index++;
      continue;
    }

    if (char === quote) {
      return { segment, nextIndex: index + 1 };
    }

    segment += char;
    index++;
  }

  return { segment, nextIndex: index };
}

function appendTomlPathSegment(segments: string[], segment: string) {
  if (segment.length > 0) {
    segments.push(segment);
  }
}

function isTomlPathWhitespace(char: string) {
  return char === ' ' || char === '\t';
}

function parseTomlAssignment(line: string): GraphqlTomlAssignment | undefined {
  const assignmentIndex = line.indexOf('=');
  if (assignmentIndex < 1) {
    return undefined;
  }

  const key = line.slice(0, assignmentIndex).trimEnd();
  return isTomlAssignmentKey(key) ? { key, value: line.slice(assignmentIndex + 1) } : undefined;
}

function isTomlAssignmentKey(value: string) {
  return value.length > 0 && [...value].every(isTomlAssignmentKeyCharacter);
}

function isTomlAssignmentKeyCharacter(char: string) {
  return isAsciiLetter(char) || isAsciiDigit(char) || char === '_' || char === '.' || char === '-';
}

function isAsciiLetter(char: string) {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}

function isAsciiDigit(char: string) {
  return char >= '0' && char <= '9';
}

function parseTomlStringLiteral(value: string) {
  const trimmedValue = value.trim();
  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return undefined;
}

function getGenerateTargetsFromGraphqlConfigObject(config: unknown) {
  return [
    getGenerateTargetsFromGeneratesRecord(
      getNestedValue(config, ['extensions', 'codegen', 'generates']),
    ),
    ...getGenerateTargetsFromGraphqlProjectConfigs(config),
  ];
}

function getGenerateTargetsFromGraphqlProjectConfigs(config: unknown) {
  const projects = getNestedValue(config, ['projects']);
  if (!isRecord(projects)) {
    return [];
  }

  return Object.values(projects).map(project =>
    getGenerateTargetsFromGeneratesRecord(
      getNestedValue(project, ['extensions', 'codegen', 'generates']),
    ),
  );
}

function collectGenerateTargets(generateTargetsGroups: GraphqlGenerateTarget[][]) {
  const generateTargets = new Map<string, GraphqlGenerateTarget>();

  for (const generateTargetsGroup of generateTargetsGroups) {
    for (const generateTarget of generateTargetsGroup) {
      generateTargets.set(generateTarget.outputPath, generateTarget);
    }
  }

  return [...generateTargets.values()];
}

function getGenerateTargetsFromSource(
  sourceText: string,
  filePath: NormalizedAbsolutePath,
): GraphqlGenerateTarget[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const configObject = extractExportedObjectLiteral(sourceFile);
  if (!configObject) {
    return [];
  }

  return collectGenerateTargets([
    getGenerateTargetsFromGeneratesObjectLiteral(
      resolveNamedObjectLiteralPath(configObject, ['generates'], sourceFile),
      sourceFile,
    ),
    ...getGenerateTargetsFromGraphqlConfigSourceObject(configObject, sourceFile),
  ]);
}

function getGenerateTargetsFromGraphqlConfigSourceObject(
  configObject: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
) {
  return [
    getGenerateTargetsFromGeneratesObjectLiteral(
      resolveNamedObjectLiteralPath(
        configObject,
        ['extensions', 'codegen', 'generates'],
        sourceFile,
      ),
      sourceFile,
    ),
    ...getGenerateTargetsFromGraphqlProjectSourceObject(configObject, sourceFile),
  ];
}

function getGenerateTargetsFromGraphqlProjectSourceObject(
  configObject: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
) {
  const projectsObject = resolveNamedObjectLiteralPath(configObject, ['projects'], sourceFile);
  if (!projectsObject) {
    return [];
  }

  return projectsObject.properties.flatMap(property => {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
      return [];
    }

    const projectObject = resolveObjectLiteral(property.initializer, sourceFile);

    return projectObject
      ? [
          getGenerateTargetsFromGeneratesObjectLiteral(
            resolveNamedObjectLiteralPath(
              projectObject,
              ['extensions', 'codegen', 'generates'],
              sourceFile,
            ),
            sourceFile,
          ),
        ]
      : [];
  });
}

function getGenerateTargetsFromGeneratesObjectLiteral(
  generatesObject: ts.ObjectLiteralExpression | undefined,
  sourceFile: ts.SourceFile,
) {
  if (!generatesObject) {
    return [];
  }

  return generatesObject.properties.flatMap(property => {
    if (
      !ts.isPropertyAssignment(property) ||
      ts.isComputedPropertyName(property.name) ||
      !ts.isStringLiteralLike(property.name)
    ) {
      return [];
    }

    if (!isLiteralPathToken(property.name.text)) {
      return [];
    }

    return [
      createGraphqlGenerateTarget(
        property.name.text,
        extractGenerateConfigFromSource(property.initializer, sourceFile),
      ),
    ];
  });
}

function createGraphqlGenerateTarget(
  outputPath: string,
  generateConfig: unknown,
): GraphqlGenerateTarget {
  const presetConfig =
    isRecord(generateConfig) && isRecord(generateConfig.presetConfig)
      ? generateConfig.presetConfig
      : undefined;

  return {
    outputPath,
    preset:
      isRecord(generateConfig) && typeof generateConfig.preset === 'string'
        ? generateConfig.preset
        : undefined,
    generatedFileExtension:
      presetConfig && typeof presetConfig.extension === 'string'
        ? presetConfig.extension
        : undefined,
  };
}

function extractGenerateConfigFromSource(expression: ts.Expression, sourceFile: ts.SourceFile) {
  const configObject = resolveObjectLiteral(expression, sourceFile);
  if (!configObject) {
    return undefined;
  }

  const presetConfigInitializer = getNamedObjectPropertyInitializer(configObject, 'presetConfig');
  const presetConfig = presetConfigInitializer
    ? resolveObjectLiteral(presetConfigInitializer, sourceFile)
    : undefined;

  return {
    preset: getNamedStringPropertyValue(configObject, 'preset'),
    presetConfig: presetConfig
      ? {
          extension: getNamedStringPropertyValue(presetConfig, 'extension'),
        }
      : undefined,
  };
}

async function resolveGraphqlGenerateTargetOutputs(
  baseDir: NormalizedAbsolutePath,
  packageDir: NormalizedAbsolutePath,
  generateTarget: GraphqlGenerateTarget,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
) {
  if (!isGraphqlDirectoryOutput(generateTarget.outputPath)) {
    return resolveGeneratedOutputsFromLiteralPaths(
      baseDir,
      packageDir,
      [generateTarget.outputPath],
      true,
      createGraphqlOutputFileMatcher(generateTarget, sourceFileMatcher),
    );
  }

  if (isNearOperationFilePreset(generateTarget.preset)) {
    return resolveGeneratedOutputsFromLiteralPaths(
      baseDir,
      packageDir,
      [generateTarget.outputPath],
      true,
      createNearOperationFileMatcher(generateTarget, sourceFileMatcher),
    );
  }

  if (isGeneratedOnlyGraphqlDirectory(generateTarget.outputPath)) {
    return resolveGeneratedOutputsFromLiteralPaths(
      baseDir,
      packageDir,
      [generateTarget.outputPath],
      true,
      sourceFileMatcher,
    );
  }

  return watchOnlyGraphqlDirectoryOutput(baseDir, packageDir, generateTarget.outputPath);
}

function isGraphqlDirectoryOutput(outputPath: string) {
  const normalizedPath = outputPath.replaceAll('\\', '/');
  return normalizedPath.endsWith('/') || extname(normalizedPath) === '';
}

function isNearOperationFilePreset(preset?: string) {
  return preset?.includes('near-operation-file') === true;
}

function isGeneratedOnlyGraphqlDirectory(outputPath: string) {
  return outputPath
    .replaceAll('\\', '/')
    .split('/')
    .some(segment => GRAPHQL_GENERATED_DIRECTORY_SEGMENTS.has(segment));
}

function createGraphqlOutputFileMatcher(
  generateTarget: GraphqlGenerateTarget,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
) {
  if (!isNearOperationFilePreset(generateTarget.preset)) {
    return sourceFileMatcher;
  }

  return createNearOperationFileMatcher(generateTarget, sourceFileMatcher);
}

function createNearOperationFileMatcher(
  generateTarget: GraphqlGenerateTarget,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
) {
  const generatedFileExtension =
    generateTarget.generatedFileExtension ?? DEFAULT_NEAR_OPERATION_FILE_EXTENSION;

  return (filePath: NormalizedAbsolutePath) =>
    filePath.endsWith(generatedFileExtension) && (sourceFileMatcher?.(filePath) ?? true);
}

async function watchOnlyGraphqlDirectoryOutput(
  baseDir: NormalizedAbsolutePath,
  packageDir: NormalizedAbsolutePath,
  outputPath: string,
): Promise<ResolvedGeneratedOutputs> {
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set(),
    outputDirectories: new Set(),
    watchedOutputPaths: new Set(),
  };
  const resolvedPath = resolveLiteralPath(outputPath, packageDir, baseDir);
  if (!resolvedPath) {
    return resolvedOutputs;
  }

  resolvedOutputs.watchedOutputPaths.add(resolvedPath);

  const stats = await safeStat(resolvedPath);
  if (stats?.isDirectory()) {
    resolvedOutputs.outputDirectories.add(resolvedPath);
  }

  return resolvedOutputs;
}

function mergeResolvedGeneratedOutputs(
  target: ResolvedGeneratedOutputs,
  source: ResolvedGeneratedOutputs,
) {
  for (const filePath of source.filePaths) {
    target.filePaths.add(filePath);
  }

  for (const outputDirectory of source.outputDirectories) {
    target.outputDirectories.add(outputDirectory);
  }

  for (const watchedOutputPath of source.watchedOutputPaths) {
    target.watchedOutputPaths.add(watchedOutputPath);
  }
}

function extractExportedObjectLiteral(
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      const objectLiteral = resolveObjectLiteral(statement.expression, sourceFile);
      if (objectLiteral) {
        return objectLiteral;
      }
    }

    if (
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isModuleExportsExpression(statement.expression.left)
    ) {
      const objectLiteral = resolveObjectLiteral(statement.expression.right, sourceFile);
      if (objectLiteral) {
        return objectLiteral;
      }
    }
  }

  return undefined;
}

function resolveObjectLiteral(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  visitedIdentifiers: Set<string> = new Set(),
): ts.ObjectLiteralExpression | undefined {
  if (ts.isParenthesizedExpression(expression)) {
    return resolveObjectLiteral(expression.expression, sourceFile, visitedIdentifiers);
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return resolveObjectLiteral(expression.expression, sourceFile, visitedIdentifiers);
  }

  if (ts.isTypeAssertionExpression(expression)) {
    return resolveObjectLiteral(expression.expression, sourceFile, visitedIdentifiers);
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }

  if (ts.isIdentifier(expression)) {
    if (visitedIdentifiers.has(expression.text)) {
      return undefined;
    }

    visitedIdentifiers.add(expression.text);
    return resolveTopLevelIdentifierObject(expression.text, sourceFile, visitedIdentifiers);
  }

  return undefined;
}

function resolveTopLevelIdentifierObject(
  identifierName: string,
  sourceFile: ts.SourceFile,
  visitedIdentifiers: Set<string>,
): ts.ObjectLiteralExpression | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        declaration.name.text !== identifierName ||
        !declaration.initializer
      ) {
        continue;
      }

      const objectLiteral = resolveObjectLiteral(
        declaration.initializer,
        sourceFile,
        visitedIdentifiers,
      );
      if (objectLiteral) {
        return objectLiteral;
      }
    }
  }

  return undefined;
}

function isModuleExportsExpression(expression: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'module' &&
    expression.name.text === 'exports'
  );
}

function getPropertyName(name: ts.PropertyName) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
    return name.text;
  }
  return undefined;
}

function getNamedObjectPropertyInitializer(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
) {
  const property = objectLiteral.properties.find(property => {
    return (
      ts.isPropertyAssignment(property) &&
      !ts.isComputedPropertyName(property.name) &&
      getPropertyName(property.name) === propertyName
    );
  });

  if (!property || !ts.isPropertyAssignment(property)) {
    return undefined;
  }

  return property.initializer;
}

function resolveNamedObjectLiteralPath(
  objectLiteral: ts.ObjectLiteralExpression,
  path: string[],
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | undefined {
  let currentObject: ts.ObjectLiteralExpression | undefined = objectLiteral;

  for (const propertyName of path) {
    const initializer = currentObject
      ? getNamedObjectPropertyInitializer(currentObject, propertyName)
      : undefined;
    if (!initializer) {
      return undefined;
    }

    currentObject = resolveObjectLiteral(initializer, sourceFile);
  }

  return currentObject;
}

function getNamedStringPropertyValue(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
) {
  const initializer = getNamedObjectPropertyInitializer(objectLiteral, propertyName);
  return initializer && ts.isStringLiteralLike(initializer) ? initializer.text : undefined;
}

function getNestedValue(value: unknown, path: string[]) {
  let current: unknown = value;

  for (const pathSegment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[pathSegment];
  }

  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
