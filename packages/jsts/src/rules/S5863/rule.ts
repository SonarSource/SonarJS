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
// https://sonarsource.github.io/rspec/#/rspec/S5863/javascript

import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  areEquivalent,
  Chai,
  generateMeta,
  isIdentifier,
  isLiteral,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    if (!Chai.isImported(context)) {
      return {};
    }
    return {
      ExpressionStatement(node: estree.Node) {
        const { expression } = node as estree.ExpressionStatement;
        checkExpect(context, expression);
        checkShould(context, expression);
        checkAssert(context, expression);
      },
    };
  },
};

function checkAssert(context: Rule.RuleContext, expression: estree.Expression) {
  if (expression.type === 'CallExpression') {
    const { callee, arguments: args } = expression;
    if (callee.type === 'MemberExpression' && isIdentifier(callee.object, 'assert')) {
      findDuplicates(context, args);
    }
  }
}

function checkExpect(context: Rule.RuleContext, expression: estree.Expression) {
  let currentExpression: estree.Node = expression;
  let args: estree.Node[] = [];

  while (true) {
    if (currentExpression.type === 'CallExpression') {
      args = [...currentExpression.arguments, ...args];
      currentExpression = currentExpression.callee;
    } else if (currentExpression.type === 'MemberExpression') {
      currentExpression = currentExpression.object;
    } else if (isIdentifier(currentExpression, 'expect')) {
      break;
    } else {
      return;
    }
  }

  findDuplicates(context, args);
}

function checkShould(context: Rule.RuleContext, expression: estree.Expression) {
  let currentExpression: estree.Node = expression;
  let args: estree.Node[] = [];
  let hasShould = false;

  while (true) {
    if (currentExpression.type === 'CallExpression') {
      args = [...currentExpression.arguments, ...args];
      currentExpression = currentExpression.callee;
    } else if (currentExpression.type === 'MemberExpression') {
      if (isIdentifier(currentExpression.property, 'should')) {
        hasShould = true;
      }
      currentExpression = currentExpression.object;
    } else if (isIdentifier(currentExpression, 'should')) {
      break;
    } else if (hasShould) {
      args = [currentExpression, ...args];
      break;
    } else {
      return;
    }
  }

  findDuplicates(context, args);
}

function findDuplicates(context: Rule.RuleContext, args: estree.Node[]) {
  for (let i = 0; i < args.length; i++) {
    for (let j = i + 1; j < args.length; j++) {
      const duplicates = areEquivalent(
        args[i] as TSESTree.Node,
        args[j] as TSESTree.Node,
        context.sourceCode,
      );
      if (duplicates && !isLiteral(args[i])) {
        report(context, { message: `Replace this argument or its duplicate.`, node: args[i] }, [
          toSecondaryLocation(args[j]),
        ]);
      }
    }
  }
}
