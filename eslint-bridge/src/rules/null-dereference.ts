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
// https://jira.sonarsource.com/browse/RSPEC-22259

import { Rule, Scope } from 'eslint';
import { isRequiredParserServices } from '../utils/parser-services';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { findFirstMatchingAncestor } from '../utils/ancestor-finder';
import { isUndefinedOrNull } from '../utils/type-checking';
import { functionLike } from '../utils/ast-shape';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    const alreadyRaisedSymbols: Set<Scope.Variable> = new Set();

    function checkNullDereference(node: estree.Node) {
      if (node.type !== 'Identifier') {
        return;
      }
      const scope = context.getScope();
      const symbol = scope.references.find(v => v.identifier === node)?.resolved;
      if (!symbol) {
        return;
      }

      const enclosingFunction = context.getAncestors().find(n => functionLike.has(n.type));

      if (
        !alreadyRaisedSymbols.has(symbol) &&
        !isWrittenInInnerFunction(symbol, enclosingFunction) &&
        isUndefinedOrNull(node, services)
      ) {
        alreadyRaisedSymbols.add(symbol);
        context.report({
          message: `TypeError can be thrown as "${node.name}" might be null or undefined here.`,
          node,
        });
      }
    }

    function isWrittenInInnerFunction(symbol: Scope.Variable, fn: estree.Node | undefined) {
      return symbol.references.some(ref => {
        if (ref.isWrite() && ref.identifier.hasOwnProperty('parent')) {
          const enclosingFn = findFirstMatchingAncestor(ref.identifier as TSESTree.Node, node =>
            functionLike.has(node.type),
          );
          return enclosingFn && enclosingFn !== fn;
        }
        return false;
      });
    }

    return {
      MemberExpression(node: estree.Node) {
        const { object } = node as estree.MemberExpression;
        checkNullDereference(object);
      },
      ForOfStatement(node: estree.Node) {
        const { right } = node as estree.ForOfStatement;
        checkNullDereference(right);
      },
      'Program:exit'() {
        alreadyRaisedSymbols.clear();
      },
    };
  },
};
