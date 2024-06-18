/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  docsUrl,
  getFirstToken,
  getFirstTokenAfter,
  getJsxShortCircuitNodes,
  getMainFunctionTokenLocation,
  isIfStatement,
  isLogicalExpression,
  issueLocation,
  IssueLocation,
  report,
} from '../helpers';

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

const rule: TSESLint.RuleModule<string, (number | 'metric' | 'sonar-runtime')[]> = {
  meta: {
    messages: {
      refactorFunction: message,
      sonarRuntime: '{{sonarRuntimeData}}',
      fileComplexity: '{{complexityAmount}}',
    },
    type: 'suggestion',
    docs: {
      description: 'Cognitive Complexity of functions should not be too high',
      recommended: 'error',
      url: docsUrl(__filename),
    },
    schema: [
      { type: 'integer', minimum: 0 },
      {
        // internal parameter
        type: 'string',
        enum: ['sonar-runtime', 'metric'],
      },
    ],
  },
  create(context) {
    const { options } = context;

    /** Complexity threshold */
    const threshold = typeof options[0] === 'number' ? options[0] : DEFAULT_THRESHOLD;

    /** Indicator if the file complexity should be reported */
    const isFileComplexity = context.options.includes('metric');

    /** Set of already considered (with already computed complexity) logical expressions */
    const consideredLogicalExpressions: Set<TSESTree.Node> = new Set();

    /** Stack of scopes that are either functions or the program */
    const scopes: ScopeComplexity[] = [];

    return {
      ':function': (node: TSESTree.Node) => {
        onEnterFunction(node as TSESTree.FunctionLike);
      },
      ':function:exit'(node: TSESTree.Node) {
        onLeaveFunction(node as TSESTree.FunctionLike);
      },
      '*'(node: TSESTree.Node) {
        if (scopes[scopes.length - 1]?.nestingNodes.has(node)) {
          scopes[scopes.length - 1].nestingLevel++;
        }
      },
      '*:exit'(node: TSESTree.Node) {
        if (scopes[scopes.length - 1]?.nestingNodes.has(node)) {
          scopes[scopes.length - 1].nestingLevel--;
          scopes[scopes.length - 1].nestingNodes.delete(node);
        }
      },
      Program(node: TSESTree.Program) {
        scopes.push({
          node,
          nestingLevel: 0,
          nestingNodes: new Set(),
          complexityPoints: [],
        });
      },
      'Program:exit'(node: TSESTree.Node) {
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
              ),
            },
          });
        }
      },
      IfStatement(node: TSESTree.Node) {
        visitIfStatement(node as TSESTree.IfStatement);
      },
      ForStatement(node: TSESTree.Node) {
        visitLoop(node as TSESTree.ForStatement);
      },
      ForInStatement(node: TSESTree.Node) {
        visitLoop(node as TSESTree.ForInStatement);
      },
      ForOfStatement(node: TSESTree.Node) {
        visitLoop(node as TSESTree.ForOfStatement);
      },
      DoWhileStatement(node: TSESTree.Node) {
        visitLoop(node as TSESTree.DoWhileStatement);
      },
      WhileStatement(node: TSESTree.Node) {
        visitLoop(node as TSESTree.WhileStatement);
      },
      SwitchStatement(node: TSESTree.Node) {
        visitSwitchStatement(node as TSESTree.SwitchStatement);
      },
      ContinueStatement(node: TSESTree.Node) {
        visitContinueOrBreakStatement(node as TSESTree.ContinueStatement);
      },
      BreakStatement(node: TSESTree.Node) {
        visitContinueOrBreakStatement(node as TSESTree.BreakStatement);
      },
      CatchClause(node: TSESTree.Node) {
        visitCatchClause(node as TSESTree.CatchClause);
      },
      LogicalExpression(node: TSESTree.Node) {
        visitLogicalExpression(node as TSESTree.LogicalExpression);
      },
      ConditionalExpression(node: TSESTree.Node) {
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
        getMainFunctionTokenLocation(node, node.parent, context),
      );
    }

    function visitIfStatement(ifStatement: TSESTree.IfStatement) {
      const { parent } = ifStatement;
      const { loc: ifLoc } = getFirstToken(ifStatement, context);
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
        const elseTokenLoc = getFirstTokenAfter(ifStatement.consequent, context)!.loc;
        addComplexity(elseTokenLoc);
      }
    }

    function visitLoop(loop: LoopStatement) {
      addStructuralComplexity(getFirstToken(loop, context).loc);
      scopes[scopes.length - 1].nestingNodes.add(loop.body);
    }

    function visitSwitchStatement(switchStatement: TSESTree.SwitchStatement) {
      addStructuralComplexity(getFirstToken(switchStatement, context).loc);
      for (const switchCase of switchStatement.cases) {
        scopes[scopes.length - 1].nestingNodes.add(switchCase);
      }
    }

    function visitContinueOrBreakStatement(
      statement: TSESTree.ContinueStatement | TSESTree.BreakStatement,
    ) {
      if (statement.label) {
        addComplexity(getFirstToken(statement, context).loc);
      }
    }

    function visitCatchClause(catchClause: TSESTree.CatchClause) {
      addStructuralComplexity(getFirstToken(catchClause, context).loc);
      scopes[scopes.length - 1].nestingNodes.add(catchClause.body);
    }

    function visitConditionalExpression(conditionalExpression: TSESTree.ConditionalExpression) {
      const questionTokenLoc = getFirstTokenAfter(conditionalExpression.test, context)!.loc;
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
            const operatorTokenLoc = getFirstTokenAfter(current.left, context)!.loc;
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
            context.getSourceCode().getText(parent.left) === context.getSourceCode().getText(left)
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
          return issueLocation(location, undefined, message);
        });

        report(
          context,
          {
            messageId: 'refactorFunction',
            data: {
              complexityAmount,
              threshold,
            },
            loc,
          },
          secondaryLocations,
          message,
          complexityAmount - threshold,
        );
      }
    }
  },
};

export = rule;

type ComplexityPoint = {
  complexity: number;
  location: TSESTree.SourceLocation;
};
