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
// https://sonarsource.github.io/rspec/#/rspec/S1301

import { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers';
import { meta } from './meta';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      smallSwitch: '"switch" statements should have at least 3 "case" clauses',
    },
  }),
  create(context) {
    return {
      SwitchStatement(node: estree.SwitchStatement) {
        const { cases } = node;
        const hasDefault = cases.some(x => !x.test);
        if (cases.length < 2 || (cases.length === 2 && hasDefault)) {
          const firstToken = context.sourceCode.getFirstToken(node);
          if (firstToken) {
            context.report({
              messageId: 'smallSwitch',
              loc: firstToken.loc,
            });
          }
        }
      },
    };
  },
};
