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
// https://sonarsource.github.io/rspec/#/rspec/S3776

import type { TSESTree } from '@typescript-eslint/utils';
import {
  getFirstToken,
  getFirstTokenAfter,
  getJsxShortCircuitNodes,
  getMainFunctionTokenLocation,
  isIfStatement,
  isLogicalExpression,
  IssueLocation,
  report,
  RuleContext,
  toSecondaryLocation,
} from '../helpers';
import { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';
import { FromSchema } from 'json-schema-to-ts';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

const DEFAULT_THRESHOLD = 15;

type LoopStatement =
  | TSESTree.ForStatement
  | TSESTree.ForInStatement
  | TSESTree.ForOfStatement
  | TSESTree.DoWhileStatement
  | TSESTree.WhileStatement;

interface ScopeComplexity {
  node: TSESTree.Program | TSESTree.FunctionLike;
  nestingLevel: number;
  nestingNodes: Set<TSESTree.Node>;
  complexityPoints: ComplexityPoint[];
}

const message =
  'Refactor this function to reduce its Cognitive Complexity from {{complexityAmount}} to the {{threshold}} allowed.';

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 1,
  items: [
    { type: 'integer', minimum: 0 },
    {
      // internal parameter
      type: 'string',
      enum: ['sonar-runtime', 'metric'],
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      refactorFunction: message,
      fileComplexity: '{{complexityAmount}}',
    },
    schema,
  }),
  create(context) {
    /** Complexity threshold */
    const threshold = (context.options as FromSchema<typeof schema>)[0] ?? DEFAULT_THRESHOLD;

    /** Indicator if the file complexity should be reported */
    const isFileComplexity = context.options.includes('metric');

    /** Set of already considered (with already computed complexity) logical expressions */
    const consideredLogicalExpressions: Set<TSESTree.Node> = new Set();

    /** Stack of scopes that are either functions or the program */
    const scopes: ScopeComplexity[] = [];

    return {
      ':function': (node: estree.Node) => {
        onEnterFunction(node as TSESTree.FunctionLike);
      },
      ':function:exit'(node: estree.Node) {
        onLeaveFunction(node as TSESTree.FunctionLike);
      },
      '*'(node: estree.Node) {
        if (scopes[scopes.length - 1]?.nestingNodes.has(node as TSESTree.Node)) {
          scopes[scopes.length - 1].nestingLevel++;
        }
      },
      '*:exit'(node: estree.Node) {
        if (scopes[scopes.length - 1]?.nestingNodes.has(node as TSESTree.Node)) {
          scopes[scopes.length - 1].nestingLevel--;
          scopes[scopes.length - 1].nestingNodes.delete(node as TSESTree.Node);
        }
      },
      Program(node: estree.Program) {
        scopes.push({
          node: node as TSESTree.Program,
          nestingLevel: 0,
          nestingNodes: new Set(),
          complexityPoints: [],
        });
      },
      'Program:exit'(node: estree.Node) {
        const programComplexity = scopes.pop()!;
        if (isFileComplexity) {
          // value from the message will be saved in SonarQube as file complexity metric
          context.report({
            node,
            messageId: 'fileComplexity',
            data: {
              complexityAmount: programComplexity.complexityPoints.reduce(
                (acc, cur) => acc + cur.complexity,
                0,
              ) as any,
            },
          });
        }
      },
      IfStatement(node: estree.Node) {
        visitIfStatement(node as TSESTree.IfStatement);
      },
      ForStatement(node: estree.Node) {
        visitLoop(node as TSESTree.ForStatement);
      },
      ForInStatement(node: estree.Node) {
        visitLoop(node as TSESTree.ForInStatement);
      },
      ForOfStatement(node: estree.Node) {
        visitLoop(node as TSESTree.ForOfStatement);
      },
      DoWhileStatement(node: estree.Node) {
        visitLoop(node as TSESTree.DoWhileStatement);
      },
      WhileStatement(node: estree.Node) {
        visitLoop(node as TSESTree.WhileStatement);
      },
      SwitchStatement(node: estree.Node) {
        visitSwitchStatement(node as TSESTree.SwitchStatement);
      },
      ContinueStatement(node: estree.Node) {
        visitContinueOrBreakStatement(node as TSESTree.ContinueStatement);
      },
      BreakStatement(node: estree.Node) {
        visitContinueOrBreakStatement(node as TSESTree.BreakStatement);
      },
      CatchClause(node: estree.Node) {
        visitCatchClause(node as TSESTree.CatchClause);
      },
      LogicalExpression(node: estree.Node) {
        visitLogicalExpression(node as TSESTree.LogicalExpression);
      },
      ConditionalExpression(node: estree.Node) {
        visitConditionalExpression(node as TSESTree.ConditionalExpression);
      },
    };

    function onEnterFunction(node: TSESTree.FunctionLike) {
      scopes.push({ node, nestingLevel: 0, nestingNodes: new Set(), complexityPoints: [] });
    }

    function onLeaveFunction(node: TSESTree.FunctionLike) {
      const functionComplexity = scopes.pop()!;
      checkFunction(
        functionComplexity.complexityPoints,
        getMainFunctionTokenLocation(node, node.parent, context as unknown as RuleContext),
      );
    }

    function visitIfStatement(ifStatement: TSESTree.IfStatement) {
      const { parent } = ifStatement;
      const { loc: ifLoc } = getFirstToken(ifStatement, context as unknown as RuleContext);
      // if the current `if` statement is `else if`, do not count it in structural complexity
      if (isIfStatement(parent) && parent.alternate === ifStatement) {
        addComplexity(ifLoc);
      } else {
        addStructuralComplexity(ifLoc);
      }

      // always increase nesting level inside `then` statement
      scopes[scopes.length - 1].nestingNodes.add(ifStatement.consequent);

      // if `else` branch is not `else if` then
      // - increase nesting level inside `else` statement
      // - add +1 complexity
      if (ifStatement.alternate && !isIfStatement(ifStatement.alternate)) {
        scopes[scopes.length - 1].nestingNodes.add(ifStatement.alternate);
        const elseTokenLoc = getFirstTokenAfter(
          ifStatement.consequent,
          context as unknown as RuleContext,
        )!.loc;
        addComplexity(elseTokenLoc);
      }
    }

    function visitLoop(loop: LoopStatement) {
      addStructuralComplexity(getFirstToken(loop, context as unknown as RuleContext).loc);
      scopes[scopes.length - 1].nestingNodes.add(loop.body);
    }

    function visitSwitchStatement(switchStatement: TSESTree.SwitchStatement) {
      addStructuralComplexity(
        getFirstToken(switchStatement, context as unknown as RuleContext).loc,
      );
      for (const switchCase of switchStatement.cases) {
        scopes[scopes.length - 1].nestingNodes.add(switchCase);
      }
    }

    function visitContinueOrBreakStatement(
      statement: TSESTree.ContinueStatement | TSESTree.BreakStatement,
    ) {
      if (statement.label) {
        addComplexity(getFirstToken(statement, context as unknown as RuleContext).loc);
      }
    }

    function visitCatchClause(catchClause: TSESTree.CatchClause) {
      addStructuralComplexity(getFirstToken(catchClause, context as unknown as RuleContext).loc);
      scopes[scopes.length - 1].nestingNodes.add(catchClause.body);
    }

    function visitConditionalExpression(conditionalExpression: TSESTree.ConditionalExpression) {
      const questionTokenLoc = getFirstTokenAfter(
        conditionalExpression.test,
        context as unknown as RuleContext,
      )!.loc;
      addStructuralComplexity(questionTokenLoc);
      scopes[scopes.length - 1].nestingNodes.add(conditionalExpression.consequent);
      scopes[scopes.length - 1].nestingNodes.add(conditionalExpression.alternate);
    }

    function visitLogicalExpression(logicalExpression: TSESTree.LogicalExpression) {
      const jsxShortCircuitNodes = getJsxShortCircuitNodes(logicalExpression);
      if (jsxShortCircuitNodes != null) {
        jsxShortCircuitNodes.forEach(node => consideredLogicalExpressions.add(node));
        return;
      }

      if (isDefaultValuePattern(logicalExpression)) {
        return;
      }

      if (!consideredLogicalExpressions.has(logicalExpression)) {
        const flattenedLogicalExpressions = flattenLogicalExpression(logicalExpression);

        let previous: TSESTree.LogicalExpression | undefined;
        for (const current of flattenedLogicalExpressions) {
          if (!previous || previous.operator !== current.operator) {
            const operatorTokenLoc = getFirstTokenAfter(
              current.left,
              context as unknown as RuleContext,
            )!.loc;
            addComplexity(operatorTokenLoc);
          }
          previous = current;
        }
      }
    }

    function isDefaultValuePattern(node: TSESTree.LogicalExpression) {
      const { left, right, operator, parent } = node;

      const operators = ['||', '??'];
      const literals = ['Literal', 'ArrayExpression', 'ObjectExpression'];

      switch (parent?.type) {
        /* Matches: const x = a || literal */
        case 'VariableDeclarator':
          return operators.includes(operator) && literals.includes(right.type);
        /* Matches: a = a || literal */
        case 'AssignmentExpression':
          return (
            operators.includes(operator) &&
            literals.includes(right.type) &&
            context.sourceCode.getText((parent as estree.AssignmentExpression).left) ===
              context.sourceCode.getText(left as estree.Node)
          );
        default:
          return false;
      }
    }

    function flattenLogicalExpression(node: TSESTree.Node): TSESTree.LogicalExpression[] {
      if (isLogicalExpression(node)) {
        consideredLogicalExpressions.add(node);
        return [
          ...flattenLogicalExpression(node.left),
          node,
          ...flattenLogicalExpression(node.right),
        ];
      }
      return [];
    }

    function addStructuralComplexity(location: TSESTree.SourceLocation) {
      const added = scopes[scopes.length - 1].nestingLevel + 1;
      const complexityPoint = { complexity: added, location };
      scopes[scopes.length - 1].complexityPoints.push(complexityPoint);
    }

    function addComplexity(location: TSESTree.SourceLocation) {
      const complexityPoint = { complexity: 1, location };
      scopes[scopes.length - 1].complexityPoints.push(complexityPoint);
    }

    function checkFunction(complexity: ComplexityPoint[] = [], loc: TSESTree.SourceLocation) {
      if (isFileComplexity) {
        return;
      }
      const complexityAmount = complexity.reduce((acc, cur) => acc + cur.complexity, 0);
      if (complexityAmount > threshold) {
        const secondaryLocations: IssueLocation[] = complexity.map(complexityPoint => {
          const { complexity, location } = complexityPoint;
          const message =
            complexity === 1 ? '+1' : `+${complexity} (incl. ${complexity - 1} for nesting)`;
          return toSecondaryLocation({ loc: location }, message);
        });

        report(
          context,
          {
            messageId: 'refactorFunction',
            message,
            data: {
              complexityAmount: complexityAmount as any,
              threshold: threshold as any, //currently typings do not accept number
            },
            loc,
          },
          secondaryLocations,
          complexityAmount - threshold,
        );
      }
    }
  },
};

type ComplexityPoint = {
  complexity: number;
  location: TSESTree.SourceLocation;
};
