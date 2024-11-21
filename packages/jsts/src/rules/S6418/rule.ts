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
// https://sonarsource.github.io/rspec/#/rspec/S6418/javascript

import type { Rule } from 'eslint';
import {
  generateMeta,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';
import estree from 'estree';

const messages = {
  //TODO: add needed messages
  messageId: 'message body',
};

const DEFAULT_PARAM = 10;

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 1,
  items: [
    {
      // example of parameter, remove if rule has no parameters
      type: 'object',
      properties: {
        param: {
          type: 'integer',
        },
      },
      additionalProperties: false,
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(
    meta as Rule.RuleMetaData,
    { schema, messages },
    false /* true if secondary locations */,
  ),
  create(context: Rule.RuleContext) {
    // get typed rule options with FromSchema helper
    const param = (context.options as FromSchema<typeof schema>)[0]?.param ?? DEFAULT_PARAM;
    const services = context.parserServices;

    // remove this condition if the rule does not depend on TS type-checker
    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      //example
      Identifier(node: estree.Identifier) {
        const secondaries: estree.Node[] = [];
        const message = 'message body';
        const messageId = 'messageId'; // must exist in messages object of rule metadata
        if (param) {
          report(
            context,
            {
              node,
              message,
              messageId,
            },
            secondaries.map(n => toSecondaryLocation(n, 'Optional secondary location message')),
          );
        }
      },
    };
  },
};
