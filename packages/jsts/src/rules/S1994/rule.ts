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
// https://sonarsource.github.io/rspec/#/rspec/S1994/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { areEquivalent, generateMeta, getParent } from '../helpers/index.js';
import { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

class ForInfo {
  updatedExpressions: estree.Node[] = [];
  testedExpressions: estree.Node[] = [];

  constructor(readonly forLoop: estree.ForStatement) {}
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      misplacedCounter: `This loop's stop condition tests "{{test}}" but the incrementer updates "{{update}}".`,
    },
  }),
  create(context: Rule.RuleContext) {
    const forLoopStack: ForInfo[] = [];

    function join(expressions: estree.Node[]) {
      return expressions.map(expr => context.sourceCode.getText(expr)).join(', ');
    }

    function isInsideUpdate(node: estree.Node) {
      return isInside(node, f => f.update);
    }

    function isInsideTest(node: estree.Node) {
      return isInside(node, f => f.test);
    }

    function isInside(
      node: estree.Node,
      getChild: (loop: estree.ForStatement) => estree.Expression | null | undefined,
    ) {
      if (forLoopStack.length > 0) {
        const currentLoop = peekFor();
        const parentChain = context.sourceCode.getAncestors(node);
        parentChain.push(node);
        const forLoopChild = getChild(currentLoop.forLoop);
        if (forLoopChild) {
          return parentChain.some(parentChainNode => forLoopChild === parentChainNode);
        }
      }
      return false;
    }

    function peekFor() {
      return forLoopStack[forLoopStack.length - 1];
    }

    return {
      ForStatement: (node: estree.Node) => {
        forLoopStack.push(new ForInfo(node as estree.ForStatement));
      },
      'ForStatement:exit': () => {
        const forInfo = forLoopStack.pop()!;
        if (forInfo.updatedExpressions.length === 0 || !forInfo.forLoop.test) {
          return;
        }
        const hasIntersection = forInfo.testedExpressions.some(testedExpr =>
          forInfo.updatedExpressions.some(updatedExpr =>
            areEquivalent(
              updatedExpr as TSESTree.Node,
              testedExpr as TSESTree.Node,
              context.sourceCode,
            ),
          ),
        );

        if (!hasIntersection) {
          context.report({
            loc: context.sourceCode.getFirstToken(forInfo.forLoop)!.loc,
            messageId: 'misplacedCounter',
            data: {
              test: join(forInfo.testedExpressions),
              update: join(forInfo.updatedExpressions),
            },
          });
        }
      },

      'ForStatement AssignmentExpression': (node: estree.Node) => {
        if (isInsideUpdate(node)) {
          const left = (node as estree.AssignmentExpression).left;
          const assignedExpressions: estree.Node[] = [];
          computeAssignedExpressions(left, assignedExpressions);
          const { updatedExpressions } = peekFor();
          assignedExpressions.forEach(ass => updatedExpressions.push(ass));
        }
      },

      'ForStatement UpdateExpression': (node: estree.Node) => {
        if (isInsideUpdate(node)) {
          peekFor().updatedExpressions.push((node as estree.UpdateExpression).argument);
        }
      },

      'ForStatement CallExpression': (node: estree.Node) => {
        if (!isInsideUpdate(node)) {
          return;
        }
        const callee = getCalleeObject(node as estree.CallExpression);
        if (callee) {
          peekFor().updatedExpressions.push(callee);
        }
      },

      'ForStatement Identifier': (node: estree.Node) => {
        if (isInsideTest(node)) {
          const parent = getParent(context, node)!;
          if (parent.type !== 'MemberExpression' || parent.computed || parent.object === node) {
            peekFor().testedExpressions.push(node);
          }
        }
      },

      'ForStatement MemberExpression': (node: estree.Node) => {
        if (
          isInsideTest(node) &&
          getParent(context, node)!.type !== 'MemberExpression' &&
          getParent(context, node)!.type !== 'CallExpression'
        ) {
          peekFor().testedExpressions.push(node);
        }
      },
    };
  },
};

function getCalleeObject(node: estree.CallExpression) {
  let callee = node.callee;
  while (callee.type === 'MemberExpression') {
    callee = callee.object;
  }
  if (callee.type === 'Identifier' && callee !== node.callee) {
    return callee;
  }
  return null;
}

function computeAssignedExpressions(node: estree.Node | null, assigned: Array<estree.Node | null>) {
  switch (node?.type) {
    case 'ArrayPattern':
      node.elements.forEach(element => computeAssignedExpressions(element, assigned));
      break;
    case 'ObjectPattern':
      node.properties.forEach(property => computeAssignedExpressions(property, assigned));
      break;
    case 'Property':
      computeAssignedExpressions(node.value, assigned);
      break;
    case 'AssignmentPattern':
      computeAssignedExpressions(node.left, assigned);
      break;
    default:
      assigned.push(node);
  }
}
