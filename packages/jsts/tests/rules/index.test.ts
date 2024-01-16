/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import { rules as mapping } from '../../src/rules';
import fs from 'fs';
import path from 'path';

describe('index', () => {
  it('should map keys to rules definitions', () => {
    const ruleFolder = path.join(__dirname, '../../src/rules');
    const sonarKeys = fs.readdirSync(ruleFolder).filter(name => /^S\d+/.test(name));
    const mappedRules = new Map(Object.values(mapping).map(rule => [rule, true]));
    const missing = [];
    for (const sonarKey of sonarKeys) {
      const { rule } = require(path.join(ruleFolder, sonarKey));
      if (!mappedRules.has(rule)) {
        missing.push(sonarKey);
      }
    }
    expect(missing).toHaveLength(0);
  });
});
