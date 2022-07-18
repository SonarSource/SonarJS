/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import path from 'path';
import { parseAwsFromYaml } from 'yaml/parser';

describe('parseAwsFromYaml()', () => {
  it('should parse YAML syntax', () => {
    const filePath = path.join(__dirname, '../fixtures/yaml/valid-lambda.yaml');
    const parsed = parseAwsFromYaml(filePath);
    expect(parsed).toBeDefined();
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(
      expect.objectContaining({
        code: `if (foo()) bar(); else bar();`,
        line: 8,
        column: 18,
        offset: 177,
      }),
    );
  });
});
