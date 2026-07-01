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

// Test-only placeholder proving S2699 can extend assertion detection privately.
const TEST_ONLY_ASSERTION_NAME = '__sonarPrivateAssertionForTestsOnly';

export function isAdditionalAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  void context;
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === TEST_ONLY_ASSERTION_NAME
  );
}

export function isAdditionalTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  void services;
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === TEST_ONLY_ASSERTION_NAME
  );
}
