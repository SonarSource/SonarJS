/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-124

import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';

// Rough upper bound for number of possible distinct flags: there are
// only `g/i/m/u/s/y`, 8 should be enough even for typos and accidental duplicates.
const MAX_DISTINCT_FLAGS = 8;

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          regularExpression: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          flags: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const options = context.options[0] || {};
    // filters duplicates, ensures only valid flags are interpreted
    const flags = (options.flags || '')
      .slice(0, MAX_DISTINCT_FLAGS)
      .split('')
      .filter(
        (chr: string, idx: number, arr: string[]) =>
          arr.indexOf(chr) === idx && 'gimusy'.includes(chr),
      )
      .join('');
    const pattern = options.regularExpression
      ? new RegExp(options.regularExpression, flags)
      : undefined;
    const message = options.message || 'The regular expression matches this comment.';

    return {
      'Program:exit': () => {
        (context.getSourceCode().getAllComments() as TSESTree.Comment[]).forEach(comment => {
          const rawTextTrimmed = comment.value.trim();
          if (pattern && pattern.test(rawTextTrimmed)) {
            context.report({
              message,
              loc: comment.loc,
            });
          }
        });
      },
    };
  },
};
