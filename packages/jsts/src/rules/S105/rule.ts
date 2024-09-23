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
// https://sonarsource.github.io/rspec/#/rspec/S105/javascript

import { Rule } from 'eslint';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      replaceTab: 'Replace all tab characters in this file by sequences of white-spaces.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'Program:exit'() {
        const firstTab = context.sourceCode.lines
          .map((content, line) => ({ content, line }))
          .find(t => t.content.includes('\t'));

        if (firstTab !== undefined) {
          context.report({
            messageId: 'replaceTab',
            loc: { line: firstTab.line + 1, column: 0 },
          });
        }
      },
    };
  },
};
