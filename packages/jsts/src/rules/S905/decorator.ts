/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    reportExempting(
      expr =>
        isNegatedIife(expr) ||
        containsChaiExpect(expr) ||
        containsValidChaiShould(expr) ||
        isAuraLightningComponent(expr) ||
        isSequenceWithSideEffects(expr),
    ),
  );
}

function reportExempting(
  exemptionCondition: (expr: estree.Expression) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const n: estree.Node = reportDescriptor['node'];
      const expr = (n as estree.ExpressionStatement).expression;
      if (!exemptionCondition(expr)) {
        context.report(reportDescriptor);
      }
    }
  };
}

function containsChaiExpect(node: estree.Node): boolean {
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'Identifier' && node.callee.name === 'expect') {
      return true;
    } else {
      return containsChaiExpect(node.callee);
    }
  } else if (node.type === 'MemberExpression') {
    return containsChaiExpect(node.object);
  }
  return false;
}

function containsValidChaiShould(node: estree.Node, isSubexpr = false): boolean {
  if (node.type === 'CallExpression') {
    return containsValidChaiShould(node.callee, true);
  } else if (node.type === 'MemberExpression') {
    if (node.property && node.property.type === 'Identifier' && node.property.name === 'should') {
      // Expressions like `x.should` are valid only as subexpressions, not on top level
      return isSubexpr;
    } else {
      return containsValidChaiShould(node.object, true);
    }
  }
  return false;
}

function isNegatedIife(node: estree.Node): boolean {
  return node.type === 'UnaryExpression' && node.operator === '!' && isIife(node.argument);
}

function isIife(node: estree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    (node.callee.type === 'FunctionExpression' || node.callee.type === 'ArrowFunctionExpression')
  );
}

function isSequenceWithSideEffects(node: estree.Node): boolean {
  return (
    node.type === 'SequenceExpression' && node.expressions.at(-1)!.type === 'AssignmentExpression'
  );
}

function isAuraLightningComponent(node: estree.Node): boolean {
  return (
    node.type === 'ObjectExpression' &&
    node.properties.length > 0 &&
    (node as TSESTree.Node).parent?.parent?.type === 'Program'
  );
}
