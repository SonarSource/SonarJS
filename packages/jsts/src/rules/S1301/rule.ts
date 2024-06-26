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
import { docsUrl } from '../helpers';
import estree from 'estree';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      smallSwitch: '"switch" statements should have at least 3 "case" clauses',
    },
    schema: [],
    type: 'suggestion',
    docs: {
      description: '"switch" statements should have at least 3 "case" clauses',
      recommended: true,
      url: docsUrl(__filename),
    },
  },
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
