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
// https://sonarsource.github.io/rspec/#/rspec/S2004/javascript

import * as estree from 'estree';
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getMainFunctionTokenLocation,
  report,
  RuleContext,
  SONAR_RUNTIME,
  toSecondaryLocation,
} from '../helpers';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';
import rspecMeta from './meta.json';

const DEFAULT_THRESHOLD = 4;
const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 2,
  items: [
    {
      type: 'object',
      properties: {
        threshold: {
          type: 'integer',
        },
      },
      additionalProperties: false,
    },
    {
      type: 'string',
      // internal parameter for rules having secondary locations
      enum: [SONAR_RUNTIME],
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, { schema }),
  create(context: Rule.RuleContext) {
    const max = (context.options as FromSchema<typeof schema>)[0]?.threshold ?? DEFAULT_THRESHOLD;
    const nestedStack: TSESTree.FunctionLike[] = [];
    return {
      ':function'(node: estree.Node) {
        const fn = node as TSESTree.FunctionLike;
        nestedStack.push(fn);
        if (nestedStack.length === max + 1) {
          const secondaries = nestedStack.slice(0, -1);
          report(
            context,
            {
              loc: getMainFunctionTokenLocation(fn, fn.parent, context as unknown as RuleContext),
              message: `Refactor this code to not nest functions more than ${max} levels deep.`,
            },
            secondaries.map(n =>
              toSecondaryLocation(
                {
                  loc: getMainFunctionTokenLocation(n, n.parent, context as unknown as RuleContext),
                },
                'Nesting +1',
              ),
            ),
          );
        }
      },
      ':function:exit'() {
        nestedStack.pop();
      },
    };
  },
};
