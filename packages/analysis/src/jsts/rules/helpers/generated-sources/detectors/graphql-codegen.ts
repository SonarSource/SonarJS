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
import { extname } from 'node:path/posix';
import ts from 'typescript';
import yaml from 'yaml';
import {
  dirnamePath,
  type NormalizedAbsolutePath,
} from '../../../../../../../shared/src/helpers/files.js';
import { type GeneratedSourceDetector, GRAPHQL_CODEGEN_FAMILY } from '../contracts.js';
import {
  hasToolEvidence,
  resolveConfigPaths,
  resolveGeneratedOutputsFromLiteralPaths,
  type ResolvedGeneratedOutputs,
} from '../detector-api.js';
import { taskInvocationInvokesCommand, type TaskInvocation } from '../task-invocations.js';
import { addFamilyFiles, createDerivedGeneratedSources, isLiteralPathToken } from '../shared.js';

const STANDARD_GRAPHQL_CONFIGS = [
  'codegen.config.cjs',
  'codegen.config.cts',
  'codegen.config.js',
  'codegen.config.mjs',
  'codegen.config.mts',
  'codegen.config.ts',
  'codegen.yml',
  'codegen.yaml',
  'codegen.json',
  'codegen.ts',
  'codegen.js',
] as const;

export const graphqlCodegenDetector = {
  family: GRAPHQL_CODEGEN_FAMILY,
  watchedFilenames: STANDARD_GRAPHQL_CONFIGS,

  async detect({ baseDir, packageDir, getDependencies, taskInvocations, sourceFileMatcher }) {
    const matchesTaskInvocation = (taskInvocation: TaskInvocation) =>
      taskInvocationInvokesCommand(taskInvocation, 'graphql-codegen');
    const configPaths = await resolveConfigPaths({
      baseDir,
      packageDir,
      taskInvocations,
      matchesTaskInvocation,
      flags: ['--config'],
      fallbackBasenames: STANDARD_GRAPHQL_CONFIGS,
    });
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
      const resolvedOutputs = await resolveGraphqlOutputs(baseDir, configPath, sourceFileMatcher);
      addFamilyFiles(GRAPHQL_CODEGEN_FAMILY, resolvedOutputs.filePaths, derived);
      for (const outputDirectory of resolvedOutputs.outputDirectories) {
        derived.outputDirectories.add(outputDirectory);
      }
    }

    return derived;
  },
} satisfies GeneratedSourceDetector;

async function resolveGraphqlOutputs(
  baseDir: NormalizedAbsolutePath,
  configPath: NormalizedAbsolutePath,
  sourceFileMatcher?: (filePath: NormalizedAbsolutePath) => boolean,
): Promise<ResolvedGeneratedOutputs> {
  const outputPaths = await parseGraphqlGenerates(configPath);
  return resolveGeneratedOutputsFromLiteralPaths(
    baseDir,
    dirnamePath(configPath),
    outputPaths,
    true,
    sourceFileMatcher,
  );
}

async function parseGraphqlGenerates(configPath: NormalizedAbsolutePath) {
  try {
    const configContents = await readFile(configPath, 'utf8');
    const configExtension = extname(configPath).toLowerCase();

    if (configExtension === '.yml' || configExtension === '.yaml') {
      return getGeneratesKeysFromObject(yaml.parse(configContents));
    }

    if (configExtension === '.json') {
      return getGeneratesKeysFromObject(JSON.parse(configContents) as unknown);
    }

    if (
      configExtension === '.ts' ||
      configExtension === '.js' ||
      configExtension === '.mts' ||
      configExtension === '.cts' ||
      configExtension === '.mjs' ||
      configExtension === '.cjs'
    ) {
      return getGeneratesKeysFromSource(configContents, configPath);
    }
  } catch {
    // Broken or unreadable GraphQL config files should not abort the whole analysis.
    return [];
  }

  return [];
}

function getGeneratesKeysFromObject(config: unknown) {
  if (!isRecord(config) || !isRecord(config.generates)) {
    return [];
  }

  return Object.keys(config.generates).filter(isLiteralPathToken);
}

function getGeneratesKeysFromSource(
  sourceText: string,
  filePath: NormalizedAbsolutePath,
): string[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const configObject = extractExportedObjectLiteral(sourceFile);
  if (!configObject) {
    return [];
  }

  const generatesProperty = configObject.properties.find(property => {
    return (
      ts.isPropertyAssignment(property) &&
      !ts.isComputedPropertyName(property.name) &&
      getPropertyName(property.name) === 'generates'
    );
  });

  if (
    !generatesProperty ||
    !ts.isPropertyAssignment(generatesProperty) ||
    !ts.isObjectLiteralExpression(generatesProperty.initializer)
  ) {
    return [];
  }

  return generatesProperty.initializer.properties.flatMap(property => {
    if (
      !ts.isPropertyAssignment(property) ||
      ts.isComputedPropertyName(property.name) ||
      !ts.isStringLiteralLike(property.name)
    ) {
      return [];
    }

    return isLiteralPathToken(property.name.text) ? [property.name.text] : [];
  });
}

function extractExportedObjectLiteral(
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
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
): ts.ObjectLiteralExpression | undefined {
  if (ts.isParenthesizedExpression(expression)) {
    return resolveObjectLiteral(expression.expression, sourceFile);
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return resolveObjectLiteral(expression.expression, sourceFile);
  }

  if (ts.isTypeAssertionExpression(expression)) {
    return resolveObjectLiteral(expression.expression, sourceFile);
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }

  if (ts.isIdentifier(expression)) {
    return resolveTopLevelIdentifierObject(expression.text, sourceFile);
  }

  return undefined;
}

function resolveTopLevelIdentifierObject(
  identifierName: string,
  sourceFile: ts.SourceFile,
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

      const objectLiteral = resolveObjectLiteral(declaration.initializer, sourceFile);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
