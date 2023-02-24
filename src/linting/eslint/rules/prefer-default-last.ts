/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4524/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      defaultLast: 'Move this "default" clause to the end of this "switch" statement.',
    },
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.getSourceCode();
    return {
      SwitchStatement(node: estree.Node) {
        const cases = (node as estree.SwitchStatement).cases;
        const defaultPosition = cases.findIndex(c => c.test === null);

        if (defaultPosition >= 0 && defaultPosition !== cases.length - 1) {
          context.report({
            messageId: 'defaultLast',
            loc: sourceCode.getFirstToken(cases[defaultPosition])!.loc,
          });
        }
      },
    };
  },
};
