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

const ASSERT_METHOD_NAMES = new Set([
  'equal',
  'fixture',
  'instance',
  'is',
  'match',
  'not',
  'ok',
  'snapshot',
  'throws',
  'type',
  'unreachable',
]);

export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  return isFQNAssertion(getFullyQualifiedName(context, node));
}

export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node): boolean {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  return isFQNAssertion(getFullyQualifiedNameTS(services, node));
}

function isFQNAssertion(fqn: string | null | undefined): boolean {
  const normalized = fqn?.replaceAll('/', '.');
  const prefix = 'uvu.assert.';
  if (!normalized?.startsWith(prefix)) {
    return false;
  }

  const parts = normalized.slice(prefix.length).split('.');
  if (parts[0] === 'default') {
    parts.shift();
  }
  if (parts[0] === 'not') {
    if (parts.length === 1) {
      return true;
    }
    parts.shift();
  }
  return parts[0] !== undefined && ASSERT_METHOD_NAMES.has(parts[0]);
}
