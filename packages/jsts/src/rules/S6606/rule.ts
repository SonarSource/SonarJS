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
import { rules } from '../external/typescript-eslint/index.js';
import { type Rule } from 'eslint';
import {
  generateMeta,
  getTypeFromTreeNode,
  interceptReport,
  isBooleanType,
  isNullOrUndefinedType,
  isObjectType,
} from '../helpers/index.js';
import { type LogicalExpression } from 'estree';
import * as meta from './generated-meta.js';

const preferNullishCoalescingRule = rules['prefer-nullish-coalescing'];

export const rule = interceptReport(
  {
    ...preferNullishCoalescingRule,
    meta: generateMeta(meta, preferNullishCoalescingRule.meta),
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
