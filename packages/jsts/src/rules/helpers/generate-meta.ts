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

import { Rule } from 'eslint';
import fs from 'fs';
import { basename, join } from 'path/posix';
import { toUnixPath } from '@sonar/shared';

export function generateMeta(
  dirname: string,
  messages: Rule.RuleMetaData['messages'],
  schema: Rule.RuleMetaData['messages'],
  fixable: boolean,
  hasSuggestions = false,
): Rule.RuleMetaData {
  const ruleId = basename(toUnixPath(dirname));
  const meta = JSON.parse(fs.readFileSync(join(dirname, 'meta.json'), 'utf8')) as Rule.RuleMetaData;
  if (meta.fixable && !fixable) {
    throw new Error(
      `Mismatch between RSPEC metadata and implementation for rule $${ruleId} for fixable attribute`,
    );
  }
  meta.messages = messages;
  meta.schema = schema;
  meta.hasSuggestions = hasSuggestions;
  return meta;
}
