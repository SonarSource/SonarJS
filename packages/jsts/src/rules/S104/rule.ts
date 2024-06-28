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
// https://sonarsource.github.io/rspec/#/rspec/S104/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getLocsNumber, getCommentLineNumbers } from '../S138/rule';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { generateMeta } from '../helpers/generate-meta';
import { FromSchema } from 'json-schema-to-ts';

const DEFAULT = 1000;
export type Options = [
  {
    maximum: number;
  },
];

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 1,
  items: [
    {
      type: 'object',
      properties: {
        maximum: {
          type: 'integer',
        },
      },
      additionalProperties: false,
    },
  ],
} as const satisfies JSONSchema4;

const messages = {
  maxFileLine:
    'This file has {{lineCount}} lines, which is greater than {{threshold}} authorized. Split it into smaller files.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(__dirname, { messages, schema }),
  create(context: Rule.RuleContext) {
    const threshold = (context.options as FromSchema<typeof schema>)[0]?.maximum || DEFAULT;

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
