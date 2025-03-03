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
// https://sonarsource.github.io/rspec/#/rspec/S1291

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/index.js';
import * as meta from './meta.js';

const NOSONAR = 'NOSONAR';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
