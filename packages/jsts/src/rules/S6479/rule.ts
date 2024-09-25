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
// https://sonarsource.github.io/rspec/#/rspec/S6479/javascript

// inspired from `no-array-index` from `eslint-plugin-react`:
// https://github.com/jsx-eslint/eslint-plugin-react/blob/0a2f6b7e9df32215fcd4e3061ec69ea3f2eef793/lib/rules/no-array-index-key.js#L16

import pkg from 'eslint-plugin-react';
const { rules } = pkg;
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import { Rule } from 'eslint';
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
