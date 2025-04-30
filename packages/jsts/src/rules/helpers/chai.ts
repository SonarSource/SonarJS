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
  isIdentifier,
} from './index.js';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

export namespace Chai {
  export function isImported(context: Rule.RuleContext): boolean {
    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === 'chai',
      ) || getImportDeclarations(context).some(i => i.source.value === 'chai')
    );
  }

  export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node) {
    const fqn = getTSFullyQualifiedName(services, node);
    if (!fqn) {
      return false;
    }
    return fqn.startsWith('chai.assert') || fqn.startsWith('chai.expect') || fqn.includes('should');
  }

  export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
    return isAssertUsage(context, node) || isExpectUsage(context, node) || isShouldUsage(node);
  }

  function isAssertUsage(context: Rule.RuleContext, node: estree.Node) {
    // assert(), assert.<expr>(), chai.assert(), chai.assert.<expr>()
    const fqn = extractFQNforCallExpression(context, node);
    if (!fqn) {
      return false;
    }
    const names = fqn.split('.');
    return names[0] === 'chai' && names[1] === 'assert';
  }

  function isExpectUsage(context: Rule.RuleContext, node: estree.Node) {
    // expect(), chai.expect()
    return extractFQNforCallExpression(context, node) === 'chai.expect';
  }

  function isShouldUsage(node: estree.Node) {
    // <expr>.should.<expr>
    return node.type === 'MemberExpression' && isIdentifier(node.property, 'should');
  }

  function extractFQNforCallExpression(context: Rule.RuleContext, node: estree.Node) {
    if (node.type !== 'CallExpression') {
      return undefined;
    }
    return getFullyQualifiedName(context, node);
  }
}
