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

export function generateMeta(dirname: string, ruleMeta: Rule.RuleMetaData): Rule.RuleMetaData {
  const ruleId = basename(toUnixPath(dirname));
  const rspecMeta = JSON.parse(
    fs.readFileSync(join(dirname, 'meta.json'), 'utf8'),
  ) as Rule.RuleMetaData;
  if (rspecMeta.fixable && !ruleMeta.fixable) {
    throw new Error(
      `Mismatch between RSPEC metadata and implementation for rule $${ruleId} for fixable attribute`,
    );
  }
  return {
    ...ruleMeta,
    ...rspecMeta,
  };
}

/**
 * Converts a path to Unix format
 * @param path the path to convert
 * @returns the converted path
 */
function toUnixPath(path: string) {
  return path.replace(/[\\/]+/g, '/');
}
