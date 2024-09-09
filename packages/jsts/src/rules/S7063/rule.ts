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
// https://sonarsource.github.io/rspec/#/rspec/S7063/javascript

import { Rule } from 'eslint';
import { generateMeta } from '../helpers';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { meta } from './meta'; // run "npx ts-node tools/generate-meta.ts" to generate meta.json files

const messages = {
  //TODO: add needed messages
  messageId: 'message body',
};

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 0,
  items: [],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { schema, messages }, false),
  create(context: Rule.RuleContext) {
    return {};
  },
};
