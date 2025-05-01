/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
  getImportDeclarations,
  getRequireCalls,
  getTSFullyQualifiedName,
} from './index.js';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

export namespace Sinon {
  export function isImported(context: Rule.RuleContext): boolean {
    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === 'sinon',
      ) || getImportDeclarations(context).some(i => i.source.value === 'sinon')
    );
  }

  export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
    return isAssertUsage(context, node);
  }

  export function isTSAssertion(
    services: ParserServicesWithTypeInformation,
    node: ts.Node,
  ): boolean {
    if (node.kind !== ts.SyntaxKind.CallExpression) {
      return false;
    }
    const fqn = getTSFullyQualifiedName(services, node);
    return isFQNAssertion(fqn);
  }

  function isAssertUsage(context: Rule.RuleContext, node: estree.Node) {
    // assert.<expr>(), sinon.assert.<expr>()
    const fqn = extractFQNforCallExpression(context, node);
    return isFQNAssertion(fqn);
  }

  function isFQNAssertion(fqn: string | null | undefined) {
    if (!fqn) {
      return false;
    }
    const names = fqn.split('.');
    return names.length === 3 && names[0] === 'sinon' && names[1] === 'assert';
  }

  function extractFQNforCallExpression(context: Rule.RuleContext, node: estree.Node) {
    if (node.type !== 'CallExpression') {
      return undefined;
    }
    return getFullyQualifiedName(context, node);
  }
}
