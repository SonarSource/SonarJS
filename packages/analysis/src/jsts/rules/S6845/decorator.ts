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
import type { Rule } from 'eslint';
import { isNullLiteral, isNumberLiteral } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

/**
 * Suppresses the upstream report only when every conditional branch either
 * removes tabIndex or gives it a statically negative integer value.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (isTabIndexOutsideSequentialFocusOrder(reportDescriptor)) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

function isTabIndexOutsideSequentialFocusOrder(reportDescriptor: Rule.ReportDescriptor): boolean {
  if (!('node' in reportDescriptor) || reportDescriptor.node.type !== 'JSXAttribute') {
    return false;
  }

  const node = reportDescriptor.node as TSESTree.JSXAttribute;
  return (
    node.name.type === 'JSXIdentifier' &&
    node.name.name === 'tabIndex' &&
    node.value?.type === 'JSXExpressionContainer' &&
    node.value.expression.type === 'ConditionalExpression' &&
    hasOnlyNonSequentialTabIndexBranches(node.value.expression)
  );
}

function hasOnlyNonSequentialTabIndexBranches(expression: TSESTree.ConditionalExpression): boolean {
  return (
    isNonSequentialTabIndexValue(expression.consequent) &&
    isNonSequentialTabIndexValue(expression.alternate)
  );
}

function isNonSequentialTabIndexValue(expression: TSESTree.Expression): boolean {
  if (expression.type === 'ConditionalExpression') {
    return hasOnlyNonSequentialTabIndexBranches(expression);
  }

  if (isNullLiteral(expression)) {
    return true;
  }

  return (
    expression.type === 'UnaryExpression' &&
    expression.operator === '-' &&
    isNumberLiteral(expression.argument) &&
    Number.isInteger(expression.argument.value) &&
    expression.argument.value > 0
  );
}
