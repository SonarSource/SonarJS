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
// https://sonarsource.github.io/rspec/#/rspec/S1291

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

const NOSONAR = 'NOSONAR';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      noSonar: '"NOSONAR" comments should not be used.',
    },
  }),
  create(context) {
    return {
      Program: () => {
        // Note: The detection of `NOSONAR` comments must be aligned
        // with the way the analyzer computes the `NOSONAR` metrics.
        // @see `findNoSonarLines` in `nosonar.ts`
        const comments = context.sourceCode.getAllComments();
        for (const comment of comments) {
          if (!comment.loc) {
            continue;
          }
          const commentValue = comment.value.startsWith('*')
            ? comment.value.substring(1).trim()
            : comment.value.trim();
          if (commentValue.toUpperCase().startsWith(NOSONAR)) {
            context.report({
              loc: comment.loc,
              messageId: 'noSonar',
            });
          }
        }
      },
    };
  },
};
