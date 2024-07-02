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
// https://sonarsource.github.io/rspec/#/rspec/S5852/javascript

import { Rule } from 'eslint';
import { RegExpLiteral } from '@eslint-community/regexpp/ast';
import { analyse } from 'scslre';
import { createRegExpRule } from '../helpers/regex';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

const message = `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`;

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onRegExpLiteralEnter: (node: RegExpLiteral) => {
        const { reports } = analyse(node);
        if (reports.length > 0) {
          context.report({
            message,
            node: context.node,
          });
        }
      },
    };
  },
  generateMeta(rspecMeta as Rule.RuleMetaData),
);
