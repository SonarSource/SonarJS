/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S134/javascript

import { AST, Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, last, report, toSecondaryLocation } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta.js';

const DEFAULT_MAXIMUM_NESTING_LEVEL = 3;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { schema }, true),

  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const threshold =
      (context.options as FromSchema<typeof schema>)[0]?.maximumNestingLevel ??
      DEFAULT_MAXIMUM_NESTING_LEVEL;
    const nodeStack: AST.Token[] = [];
    function push(n: AST.Token) {
      nodeStack.push(n);
    }
    function pop() {
      return nodeStack.pop();
    }
    function check(node: estree.Node) {
      if (nodeStack.length === threshold) {
        report(
          context,
          {
            message: `Refactor this code to not nest more than ${threshold} if/for/while/switch/try statements.`,
            loc: sourceCode.getFirstToken(node)!.loc,
          },
          nodeStack.map(n => toSecondaryLocation(n, '+1')),
        );
      }
    }
    function isElseIf(node: estree.Node) {
      const parent = last(context.sourceCode.getAncestors(node));
      return (
        node.type === 'IfStatement' && parent.type === 'IfStatement' && node === parent.alternate
      );
    }
    const controlFlowNodes = [
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
      'IfStatement',
      'TryStatement',
      'SwitchStatement',
    ].join(',');
    return {
      [controlFlowNodes]: (node: estree.Node) => {
        if (isElseIf(node)) {
          pop();
          push(sourceCode.getFirstToken(node)!);
        } else {
          check(node);
          push(sourceCode.getFirstToken(node)!);
        }
      },
      [`${controlFlowNodes}:exit`]: (node: estree.Node) => {
        if (!isElseIf(node)) {
          pop();
        }
      },
    };
  },
};
