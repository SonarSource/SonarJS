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
// https://sonarsource.github.io/rspec/#/rspec/S124/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { schema }),
  create(context: Rule.RuleContext) {
    const options = (context.options as FromSchema<typeof schema>)[0] || {};
    const flags = options.flags || '';
    const cleanedFlags = 'gimusy'
      .split('')
      .filter(c => flags.includes(c))
      .join('');
    const pattern = options.regularExpression
      ? new RegExp(options.regularExpression, cleanedFlags)
      : undefined;
    const message = options.message || 'The regular expression matches this comment.';

    return {
      'Program:exit': () => {
        (context.sourceCode.getAllComments() as TSESTree.Comment[]).forEach(comment => {
          const rawTextTrimmed = comment.value.trim();
          if (pattern?.test(rawTextTrimmed)) {
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
