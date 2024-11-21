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
// https://sonarsource.github.io/rspec/#/rspec/S104/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { getCommentLineNumbers, getLocsNumber } from '../S138/rule.js';
import { generateMeta } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import { meta, schema } from './meta.js';

const DEFAULT = 1000;

const messages = {
  maxFileLine:
    'This file has {{lineCount}} lines, which is greater than {{threshold}} authorized. Split it into smaller files.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { messages, schema }),
  create(context: Rule.RuleContext) {
    const threshold = (context.options as FromSchema<typeof schema>)[0]?.maximum ?? DEFAULT;

    const sourceCode = context.sourceCode;
    const lines = sourceCode.lines;

    const commentLineNumbers = getCommentLineNumbers(sourceCode.getAllComments());

    return {
      'Program:exit': (node: estree.Node) => {
        if (!node.loc) {
          return;
        }

        const lineCount = getLocsNumber(node.loc, lines, commentLineNumbers);

        if (lineCount > threshold) {
          context.report({
            messageId: 'maxFileLine',
            data: {
              lineCount: lineCount.toString(),
              threshold: `${threshold}`,
            },
            loc: { line: 0, column: 0 },
          });
        }
      },
    };
  },
};
