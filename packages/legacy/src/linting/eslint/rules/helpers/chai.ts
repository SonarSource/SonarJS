/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getImportDeclarations,
  getRequireCalls,
  isFunctionInvocation,
  isIdentifier,
  isMethodCall,
  isMethodInvocation,
} from '.';

export namespace Chai {
  export function isImported(context: Rule.RuleContext): boolean {
    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === 'chai',
      ) || getImportDeclarations(context).some(i => i.source.value === 'chai')
    );
  }

  export function isAssertion(node: estree.Node): boolean {
    return isAssertUsage(node) || isExpectUsage(node) || isShouldUsage(node);
  }

  function isAssertUsage(node: estree.Node) {
    // assert(), assert.<expr>(), chai.assert(), chai.assert.<expr>()
    return (
      node.type === 'CallExpression' &&
      (isMethodInvocation(node, 'chai', 'assert', 1) ||
        isFunctionInvocation(node, 'assert', 1) ||
        (isMethodCall(node) && isIdentifier(node.callee.object, 'assert')) ||
        (isMethodCall(node) &&
          node.callee.object.type === 'MemberExpression' &&
          isIdentifier(node.callee.object.object, 'chai') &&
          isIdentifier(node.callee.object.property, 'assert')))
    );
  }

  function isExpectUsage(node: estree.Node) {
    // expect(), chai.expect()
    return (
      node.type === 'CallExpression' &&
      (isMethodInvocation(node, 'chai', 'expect', 1) || isFunctionInvocation(node, 'expect', 1))
    );
  }

  function isShouldUsage(node: estree.Node) {
    // <expr>.should.<expr>
    return node.type === 'MemberExpression' && isIdentifier(node.property, 'should');
  }
}
