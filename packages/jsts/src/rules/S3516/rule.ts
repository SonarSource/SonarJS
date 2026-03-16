/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S3516/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '../helpers/type.js';
import { findFirstMatchingAncestor, getParent } from '../helpers/ancestor.js';
import { FUNCTION_NODES, isElementWrite } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getMainFunctionTokenLocation, report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

interface BranchFrame {
  hasSideEffect: boolean;
  hasReturn: boolean;
}

interface FunctionContext {
  codePath: Rule.CodePath;
  containsReturnWithoutValue: boolean;
  returnStatements: estree.ReturnStatement[];
  branchStack: BranchFrame[];
  hasSideEffectOnlyBranch: boolean;
}

interface SingleWriteVariable {
  variable: Scope.Variable;
  initExpression?: estree.Expression | null;
}

type LiteralValue = number | RegExp | string | null | boolean | bigint;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),

  create(context: Rule.RuleContext) {
    const functionContextStack: FunctionContext[] = [];
    const codePathSegments: Rule.CodePathSegment[][] = [];
    let currentCodePathSegments: Rule.CodePathSegment[] = [];

    const checkOnFunctionExit = (node: estree.Node) =>
      checkInvariantReturnStatements(node, functionContextStack.at(-1));

    function checkInvariantReturnStatements(node: estree.Node, functionContext?: FunctionContext) {
      if (!functionContext || hasDifferentReturnTypes(functionContext, currentCodePathSegments)) {
        return;
      }

      const returnedValues = functionContext.returnStatements.map(
        returnStatement => returnStatement.argument as estree.Node,
      );
      if (areAllSameValue(returnedValues, context.sourceCode.getScope(node))) {
        // Only suppress when the returned value is a non-literal (e.g., a variable used for chaining).
        // Functions returning literals (false, null, 0, etc.) have no chaining rationale and are always flagged.
        const firstValue = getLiteralValue(returnedValues[0], context.sourceCode.getScope(node));
        if (firstValue === undefined && functionContext.hasSideEffectOnlyBranch) {
          return;
        }
        report(
          context,
          {
            message: `Refactor this function to not always return the same value.`,
            loc: getMainFunctionTokenLocation(
              node as TSESTree.FunctionLike,
              getParent(context, node) as TSESTree.Node,
              context as unknown as RuleContext,
            ),
          },
          returnedValues.map(node => toSecondaryLocation(node, 'Returned value.')),
          returnedValues.length,
        );
      }
    }

    function pushBranchFrame() {
      functionContextStack.at(-1)?.branchStack.push({ hasSideEffect: false, hasReturn: false });
    }

    function popBranchFrame() {
      const ctx = functionContextStack.at(-1);
      if (ctx) {
        const frame = ctx.branchStack.pop();
        if (frame?.hasSideEffect && !frame.hasReturn) {
          ctx.hasSideEffectOnlyBranch = true;
        }
      }
    }

    function recordSideEffect(node: estree.CallExpression | estree.AssignmentExpression) {
      const ctx = functionContextStack.at(-1);
      if (!ctx) {
        return;
      }
      const frame = ctx.branchStack.at(-1);
      if (frame) {
        frame.hasSideEffect = true;
      }
      // Also handle bare statement branches where ExpressionStatement IS the branch body
      // (e.g. `if (x) doSomething()` — no BlockStatement is pushed for such a branch)
      const exprStmt = (node as TSESTree.Node).parent as TSESTree.Node | undefined;
      if (exprStmt && isBranchBody(exprStmt)) {
        ctx.hasSideEffectOnlyBranch = true;
      }
    }

    return {
      onCodePathStart(codePath: Rule.CodePath) {
        functionContextStack.push({
          codePath,
          containsReturnWithoutValue: false,
          returnStatements: [],
          branchStack: [],
          hasSideEffectOnlyBranch: false,
        });
        codePathSegments.push(currentCodePathSegments);
        currentCodePathSegments = [];
      },
      onCodePathEnd() {
        functionContextStack.pop();
        currentCodePathSegments = codePathSegments.pop() || [];
      },
      onCodePathSegmentStart: (segment: Rule.CodePathSegment) => {
        currentCodePathSegments.push(segment);
      },
      onCodePathSegmentEnd() {
        currentCodePathSegments.pop();
      },
      ReturnStatement(node: estree.Node) {
        const currentContext = functionContextStack.at(-1);
        if (currentContext) {
          const returnStatement = node as estree.ReturnStatement;
          currentContext.containsReturnWithoutValue =
            currentContext.containsReturnWithoutValue || !returnStatement.argument;
          currentContext.returnStatements.push(returnStatement);
          const frame = currentContext.branchStack.at(-1);
          if (frame) {
            frame.hasReturn = true;
          }
        }
      },
      BlockStatement(node: estree.Node) {
        if (isBranchBody(node as TSESTree.Node)) {
          pushBranchFrame();
        }
      },
      'BlockStatement:exit'(node: estree.Node) {
        if (isBranchBody(node as TSESTree.Node)) {
          popBranchFrame();
        }
      },
      SwitchCase() {
        pushBranchFrame();
      },
      'SwitchCase:exit'() {
        popBranchFrame();
      },
      'ExpressionStatement > CallExpression'(node: estree.CallExpression) {
        recordSideEffect(node);
      },
      'ExpressionStatement > AssignmentExpression'(node: estree.AssignmentExpression) {
        recordSideEffect(node);
      },
      'FunctionDeclaration:exit': checkOnFunctionExit,
      'FunctionExpression:exit': checkOnFunctionExit,
      'ArrowFunctionExpression:exit': checkOnFunctionExit,
    };
  },
};

function hasDifferentReturnTypes(
  functionContext: FunctionContext,
  currentSegments: Rule.CodePathSegment[],
) {
  // As this method is called at the exit point of a function definition, the current
  // segments are the ones leading to the exit point at the end of the function. If they
  // are reachable, it means there is an implicit return.
  const hasImplicitReturn = currentSegments.some(segment => segment.reachable);

  return (
    hasImplicitReturn ||
    functionContext.containsReturnWithoutValue ||
    functionContext.returnStatements.length <= 1 ||
    functionContext.codePath.thrownSegments.length > 0
  );
}

function areAllSameValue(returnedValues: estree.Node[], scope: Scope.Scope) {
  const firstReturnedValue = returnedValues[0];
  const firstValue = getLiteralValue(firstReturnedValue, scope);
  if (firstValue !== undefined) {
    return returnedValues
      .slice(1)
      .every(returnedValue => getLiteralValue(returnedValue, scope) === firstValue);
  } else if (firstReturnedValue.type === 'Identifier') {
    const singleWriteVariable = getSingleWriteDefinition(firstReturnedValue.name, scope);
    if (singleWriteVariable) {
      const readReferenceIdentifiers = new Set(
        singleWriteVariable.variable.references.slice(1).map(ref => ref.identifier),
      );
      return returnedValues.every(returnedValue =>
        readReferenceIdentifiers.has(returnedValue as estree.Identifier),
      );
    }
  }
  return false;
}

function getSingleWriteDefinition(
  variableName: string,
  scope: Scope.Scope,
): SingleWriteVariable | null {
  const variable = scope.set.get(variableName);
  if (variable) {
    const references = variable.references.slice(1);
    if (!references.some(ref => ref.isWrite() || isPossibleObjectUpdate(ref))) {
      let initExpression = null;
      if (variable.defs.length === 1 && variable.defs[0].type === 'Variable') {
        initExpression = variable.defs[0].node.init;
      }
      return { variable, initExpression };
    }
  }
  return null;
}

function isPossibleObjectUpdate(ref: Scope.Reference) {
  const expressionStatement = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === 'ExpressionStatement' || FUNCTION_NODES.includes(n.type),
  ) as estree.Node | undefined;

  // To avoid FP, we consider method calls as write operations, since we do not know whether they will
  // update the object state or not.
  return (
    expressionStatement?.type === 'ExpressionStatement' &&
    (isElementWrite(expressionStatement, ref) ||
      expressionStatement.expression.type === 'CallExpression')
  );
}

function getLiteralValue(returnedValue: estree.Node, scope: Scope.Scope): LiteralValue | undefined {
  if (returnedValue.type === 'Literal') {
    return returnedValue.value;
  } else if (returnedValue.type === 'UnaryExpression') {
    const innerReturnedValue = getLiteralValue(returnedValue.argument, scope);
    return innerReturnedValue === undefined
      ? undefined
      : evaluateUnaryLiteralExpression(returnedValue.operator, innerReturnedValue);
  } else if (returnedValue.type === 'Identifier') {
    const singleWriteVariable = getSingleWriteDefinition(returnedValue.name, scope);
    if (singleWriteVariable?.initExpression) {
      return getLiteralValue(singleWriteVariable.initExpression, scope);
    }
  }
  return undefined;
}

function evaluateUnaryLiteralExpression(operator: string, innerReturnedValue: LiteralValue) {
  switch (operator) {
    case '-':
      return -Number(innerReturnedValue);
    case '+':
      return Number(innerReturnedValue);
    case '~':
      return ~Number(innerReturnedValue);
    case '!':
      return !Boolean(innerReturnedValue);
    case 'typeof':
      return typeof innerReturnedValue;
    default:
      return undefined;
  }
}

/**
 * Returns true if the node is a direct branch body of a conditional or loop statement —
 * i.e., the consequent/alternate of an IfStatement or the body of a loop.
 * Used to push and pop branch frames on the stack when entering and exiting branches.
 */
function isBranchBody(node: TSESTree.Node): boolean {
  const { parent } = node;
  if (!parent) {
    return false;
  }
  if (parent.type === 'IfStatement') {
    return node === parent.consequent || node === parent.alternate;
  }
  if (
    parent.type === 'WhileStatement' ||
    parent.type === 'DoWhileStatement' ||
    parent.type === 'ForStatement' ||
    parent.type === 'ForInStatement' ||
    parent.type === 'ForOfStatement'
  ) {
    return node === parent.body;
  }
  return false;
}
