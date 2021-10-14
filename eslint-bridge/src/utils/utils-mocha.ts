/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import * as estree from 'estree';
import { FUNCTION_NODES, isIdentifier } from '.';

export namespace Mocha {
  const TEST_CONSTRUCTS = [
    'describe',
    'context',
    'it',
    'specify',
    'before',
    'after',
    'beforeEach',
    'afterEach',
  ];

  export interface TestCase {
    node: estree.Node;
    callback: estree.Function;
  }

  export function isTestConstruct(
    node: estree.Node,
    constructs: string[] = TEST_CONSTRUCTS,
  ): boolean {
    return constructs.some(construct => {
      return (
        node.type === 'CallExpression' &&
        (isIdentifier(node.callee, construct) ||
          (node.callee.type === 'MemberExpression' &&
            isIdentifier(node.callee.object, construct) &&
            isIdentifier(node.callee.property, 'only', 'skip')))
      );
    });
  }

  export function extractTestCase(node: estree.Node): TestCase | null {
    if (isTestCase(node)) {
      const [, callback] = node.arguments;
      if (callback && FUNCTION_NODES.includes(callback.type)) {
        return { node: node.callee, callback: callback as estree.Function };
      }
    }
    return null;
  }

  function isTestCase(node: estree.Node): node is estree.CallExpression {
    return (
      node.type === 'CallExpression' &&
      (isIdentifier(node.callee, 'it') ||
        (node.callee.type === 'MemberExpression' &&
          isIdentifier(node.callee.object, 'it') &&
          isIdentifier(node.callee.property, 'only', 'skip')))
    );
  }
}
