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
import { getFullyQualifiedNameTS } from './module-ts.js';

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
  return (
    node.kind === ts.SyntaxKind.CallExpression &&
    isFQNAssertion(getFullyQualifiedNameTS(services, node))
  );
}

function isFQNAssertion(fqn: string | null): boolean {
  const normalized = fqn?.replaceAll('/', '.');
  if (normalized === undefined) {
    return false;
  }

  const lastDot = normalized.lastIndexOf('.');
  const factory = normalized.slice(0, lastDot);
  const method = normalized.slice(lastDot + 1);
  return ASSERTION_METHODS_BY_FACTORY.get(factory)?.has(method) ?? false;
}
