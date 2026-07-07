/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import {
  getVariableFromScope,
  isBinaryPlus,
  isFunctionNode,
  isIfStatement,
  isStringLiteral,
} from '../../helpers/ast.js';
import {
  flattenConjunction,
  flattenDisjunction,
  getDirectIfBranch,
  getLoopAncestors,
  hasWriteInSubtree,
  hasWriteInSubtreeBefore,
  isTypeofVariableComparedToStringLiteral,
  type NoBaseToStringMatcherContext,
} from './helpers.js';

const SAFE_TYPEOF_VALUES = new Set([
  'string',
  'number',
  'bigint',
  'boolean',
  'symbol',
  'undefined',
  'function',
]);

/**
 * Suppresses string concatenation or template interpolation reports when an enclosing
 * if branch is guarded by typeof checks proving the same bound value is primitive.
 */
export function isGuardedByTypeofCheckFalsePositive(
  reportDescriptor: Rule.ReportDescriptor,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (!('node' in reportDescriptor)) {
    return false;
  }

  const node = reportDescriptor.node as TSESTree.Node;
  if (node.type !== 'Identifier' || !isImplicitlyStringified(node)) {
    return false;
  }

  const variable = getVariableFromScope(ruleContext.sourceCode.getScope(node), node.name);
  if (!variable) {
    return false;
  }

  let current: TSESTree.Node | undefined = node;
  while (current?.parent) {
    const parent: TSESTree.Node = current.parent;
    if (isIfStatement(parent)) {
      const branch = getDirectIfBranch(parent, current);
      if (
        branch !== null &&
        conditionMakesBranchSafeToStringify(
          parent.test,
          variable,
          ruleContext,
          branch.consequent,
        ) &&
        !hasInvalidatingWrite(variable, branch.node, node, ruleContext)
      ) {
        return true;
      }
    }
    if (isFunctionNode(parent as estree.Node)) {
      break;
    }
    current = parent;
  }
  return false;
}

/**
 * Detects whether an identifier is being implicitly stringified by its surrounding expression.
 *
 * This matcher accepts template-literal interpolations and `+` concatenations, and it
 * transparently walks through TypeScript-only wrappers such as casts and non-null assertions
 * so the check still applies to the underlying value expression.
 */
function isImplicitlyStringified(node: TSESTree.Identifier): boolean {
  let current: TSESTree.Node = node;
  while (current.parent) {
    const parent: TSESTree.Node = current.parent;
    if (
      parent.type === 'TemplateLiteral' &&
      parent.expressions.includes(current as TSESTree.Expression)
    ) {
      return true;
    }
    if (isBinaryPlus(parent as estree.Node)) {
      return true;
    }
    if (
      parent.type !== 'TSAsExpression' &&
      parent.type !== 'TSTypeAssertion' &&
      parent.type !== 'TSNonNullExpression'
    ) {
      return false;
    }
    current = parent;
  }
  return false;
}

function conditionMakesBranchSafeToStringify(
  condition: TSESTree.Expression,
  variable: Scope.Variable,
  ruleContext: NoBaseToStringMatcherContext,
  isConsequentBranch: boolean,
): boolean {
  if (condition.type === 'LogicalExpression') {
    const branchAllowsSafeStringification = (expression: TSESTree.Expression) =>
      conditionMakesBranchSafeToStringify(expression, variable, ruleContext, isConsequentBranch);

    if (condition.operator === '&&') {
      const conjuncts = flattenConjunction(condition);
      return isConsequentBranch
        ? conjuncts.some(branchAllowsSafeStringification)
        : conjuncts.every(branchAllowsSafeStringification);
    }
    if (condition.operator === '||') {
      const disjuncts = flattenDisjunction(condition);
      return isConsequentBranch
        ? disjuncts.every(branchAllowsSafeStringification)
        : disjuncts.some(branchAllowsSafeStringification);
    }
    return false;
  }

  if (condition.type !== 'BinaryExpression' || condition.operator === 'in') {
    return false;
  }

  return isTypeOfGuard(condition, isConsequentBranch, variable, ruleContext);
}

function isTypeOfGuard(
  condition: TSESTree.SymmetricBinaryExpression,
  isConsequentBranch: boolean,
  variable: Scope.Variable,
  ruleContext: NoBaseToStringMatcherContext,
) {
  const { left, operator, right } = condition;
  const isTypeofSafeValueCheck = isTypeofComparisonWithExpectedValue(
    left,
    right,
    variable,
    ruleContext,
    isSafeTypeofValue,
  );
  const isTypeofObjectCheck = isTypeofComparisonWithExpectedValue(
    left,
    right,
    variable,
    ruleContext,
    node => isTypeofValue(node, 'object'),
  );

  return isConsequentBranch
    ? (operator === '===' && isTypeofSafeValueCheck) || (operator === '!==' && isTypeofObjectCheck)
    : operator === '===' && isTypeofObjectCheck;
}

function isTypeofComparisonWithExpectedValue(
  left: TSESTree.Expression,
  right: TSESTree.Expression,
  variable: Scope.Variable,
  ruleContext: NoBaseToStringMatcherContext,
  isExpectedValue: (node: TSESTree.Expression) => boolean,
): boolean {
  return (
    (isTypeofVariableComparedToStringLiteral(left, right, variable, ruleContext) &&
      isExpectedValue(right)) ||
    (isTypeofVariableComparedToStringLiteral(right, left, variable, ruleContext) &&
      isExpectedValue(left))
  );
}

function isSafeTypeofValue(node: TSESTree.Expression): boolean {
  const literal = node as estree.Node;
  return isStringLiteral(literal) && SAFE_TYPEOF_VALUES.has(literal.value);
}

function isTypeofValue(node: TSESTree.Expression, value: string): boolean {
  const literal = node as estree.Node;
  return isStringLiteral(literal) && literal.value === value;
}

function hasInvalidatingWrite(
  variable: Scope.Variable,
  branch: TSESTree.Statement,
  usage: TSESTree.Identifier,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    hasWriteInSubtreeBefore(variable, branch, usage.range[0], ruleContext) ||
    getLoopAncestors(usage, branch).some(loop => hasWriteInSubtree(variable, loop, ruleContext))
  );
}
