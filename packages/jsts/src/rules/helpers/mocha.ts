/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import estree from 'estree';
import { FUNCTION_NODES, isIdentifier } from './index.js';

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
      const callExpr = node as estree.CallExpression;
      const [, callback] = callExpr.arguments;
      if (callback && FUNCTION_NODES.includes(callback.type)) {
        return { node: callExpr.callee, callback: callback as estree.Function };
      }
    }
    return null;
  }

  /**
   * returns true if the node is a test case
   *
   * @param node
   * @returns
   */
  export function isTestCase(node: estree.Node): boolean {
    return isTestConstruct(node, ['it', 'specify']);
  }

  /**
   * returns true if the node is a describe block
   *
   * @param node
   * @returns
   */
  export function isDescribeCase(node: estree.Node): boolean {
    return isTestConstruct(node, ['describe']);
  }
}
