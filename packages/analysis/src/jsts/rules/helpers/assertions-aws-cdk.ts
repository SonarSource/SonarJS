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
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';
import { getFullyQualifiedName } from './module.js';
import { getFullyQualifiedNameTS, importsModuleTS } from './module-ts.js';

const ASSERTIONS_MODULE = 'aws-cdk-lib/assertions';

const TEMPLATE_ASSERTION_METHOD_NAMES = new Set([
  'resourceCountIs',
  'resourcePropertiesCountIs',
  'hasResourceProperties',
  'hasResource',
  'allResources',
  'allResourcesProperties',
  'hasParameter',
  'hasOutput',
  'hasMapping',
  'hasCondition',
  'templateMatches',
]);

const ASSERTION_METHODS_BY_FACTORY = new Map<string, ReadonlySet<string>>([
  ['aws-cdk-lib.assertions.Template.fromStack', TEMPLATE_ASSERTION_METHOD_NAMES],
  ['aws-cdk-lib.assertions.Template.fromJSON', TEMPLATE_ASSERTION_METHOD_NAMES],
  ['aws-cdk-lib.assertions.Template.fromString', TEMPLATE_ASSERTION_METHOD_NAMES],
  [
    'aws-cdk-lib.assertions.Annotations.fromStack',
    new Set(['hasError', 'hasNoError', 'hasWarning', 'hasNoWarning', 'hasInfo', 'hasNoInfo']),
  ],
  ['aws-cdk-lib.assertions.Tags.fromStack', new Set(['hasValues', 'hasNone'])],
]);

export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  return node.type === 'CallExpression' && isFQNAssertion(getFullyQualifiedName(context, node));
}

export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node): boolean {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  return isFQNAssertion(getFullyQualifiedNameTS(services, node));
}

export function isTSAssertionWithAssignmentFallback(
  context: Rule.RuleContext,
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  // The ESTree fallback below resolves names by walking scopes on every call expression, so it is
  // gated on the file actually importing the module. `importsModuleTS` caches per source file.
  if (!importsModuleTS(node.getSourceFile(), [ASSERTIONS_MODULE])) {
    return false;
  }
  // The type-aware resolver only follows declaration initializers. `isAssertion` delegates to
  // `getFullyQualifiedName`, whose ESTree scope resolver follows a variable's unique write, such
  // as an assertion object assigned in `beforeEach`.
  // The map only holds nodes converted from the linted file, so `undefined` here means `node`
  // belongs to another file (the caller follows calls into their implementation) and the
  // `context`-bound scope resolver could not be used on it anyway. The cast is the usual
  // TSESTree-to-ESTree widening: `isAssertion` only reads `type` and the shared node shape.
  const estreeNode = services.tsNodeToESTreeNodeMap.get(node);
  return estreeNode !== undefined && isAssertion(context, estreeNode as estree.Node);
}

function isFQNAssertion(fqn: string | null | undefined): boolean {
  const normalized = fqn?.replaceAll('/', '.');
  if (normalized === undefined) {
    return false;
  }

  const lastDot = normalized.lastIndexOf('.');
  const factory = normalized.slice(0, lastDot);
  const method = normalized.slice(lastDot + 1);
  return ASSERTION_METHODS_BY_FACTORY.get(factory)?.has(method) ?? false;
}
