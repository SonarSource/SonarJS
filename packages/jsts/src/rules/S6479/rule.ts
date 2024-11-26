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
// https://sonarsource.github.io/rspec/#/rspec/S6479/javascript

// inspired from `no-array-index` from `eslint-plugin-react`:
// https://github.com/jsx-eslint/eslint-plugin-react/blob/0a2f6b7e9df32215fcd4e3061ec69ea3f2eef793/lib/rules/no-array-index-key.js#L16

import { rules } from '../external/react.js';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import type { Rule } from 'eslint';
import { meta } from './meta.js';

const baseRule = rules['no-array-index-key'];

export const rule = interceptReportForReact(
  {
    ...baseRule,
    meta: generateMeta(meta as Rule.RuleMetaData, baseRule.meta),
  },
  (context, reportDescriptor) => {
    const { node } = reportDescriptor as Rule.ReportDescriptor & {
      node: Rule.Node;
    };

    if (node.type === 'BinaryExpression') {
      return;
    }

    // we got a report from ESLint, hence one of the expressions included in the literal _is_ the array index
    // we can then safely bail if there is another expression in the literal
    if (node.type === 'TemplateLiteral' && node.expressions.length > 1) {
      return;
    }

    context.report(reportDescriptor);
  },
);
