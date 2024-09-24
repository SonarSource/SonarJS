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
import { tsEslintRules } from '../typescript-eslint/index.ts';
import { type Rule } from 'eslint';
import {
  generateMeta,
  getTypeFromTreeNode,
  interceptReport,
  isBooleanType,
  isNullOrUndefinedType,
  isObjectType,
} from '../helpers/index.ts';
import { type LogicalExpression } from 'estree';
import { meta } from './meta.ts';

const preferNullishCoalescingRule = tsEslintRules['prefer-nullish-coalescing'];

export const rule = interceptReport(
  {
    ...preferNullishCoalescingRule,
    meta: generateMeta(meta as Rule.RuleMetaData, preferNullishCoalescingRule.meta),
  },
  (context, reportDescriptor) => {
    const { node: token, messageId } = reportDescriptor as Rule.ReportDescriptor & {
      node: Rule.Node;
      messageId: string;
    };

    if (messageId === 'preferNullishOverOr') {
      const services = context.sourceCode.parserServices;
      const rangeIndex = (
        token as {
          range: [number, number];
        }
      ).range[0];
      const node = context.sourceCode.getNodeByRangeIndex(rangeIndex) as LogicalExpression;
      const leftOperand = node.left;
      const leftOperandType = getTypeFromTreeNode(leftOperand, services);

      if (
        leftOperandType.isUnion() &&
        leftOperandType.types.some(isNullOrUndefinedType) &&
        (leftOperandType.types.some(isBooleanType) || leftOperandType.types.some(isObjectType))
      ) {
        return;
      }
    }

    context.report(reportDescriptor);
  },
);
