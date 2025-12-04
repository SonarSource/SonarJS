/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import estree from 'estree';
import {
  getFullyQualifiedName,
  getFullyQualifiedNameTS,
  getImportDeclarations,
  getRequireCalls,
} from './index.js';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

export namespace Vitest {
  export function isImported(context: Rule.RuleContext): boolean {
    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === 'vitest',
      ) || getImportDeclarations(context).some(i => i.source.value === 'vitest')
    );
  }

  export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
    const fullyQualifiedName = extractFQNforCallExpression(context, node);
    return isFQNAssertion(fullyQualifiedName);
  }

  export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node) {
    if (node.kind !== ts.SyntaxKind.CallExpression) {
      return false;
    }
    const fqn = getFullyQualifiedNameTS(services, node);
    return isFQNAssertion(fqn);
  }

  function isFQNAssertion(fqn: string | null | undefined) {
    if (!fqn) {
      return false;
    }
    const validAssertionCalls = ['vitest.expect', 'vitest.expectTypeOf', 'vitest.assertType'];
    return validAssertionCalls.some(callPrefix => fqn.startsWith(callPrefix));
  }

  function extractFQNforCallExpression(context: Rule.RuleContext, node: estree.Node) {
    if (node.type !== 'CallExpression') {
      return undefined;
    }
    return getFullyQualifiedName(context, node);
  }
}
