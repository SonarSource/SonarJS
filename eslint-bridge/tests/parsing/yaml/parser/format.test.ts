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
import * as yaml from 'yaml';
import path from 'path';
import { readFile } from 'helpers';
import { isSupportedFormat, SUPPORTED_STRING_FORMATS } from 'parsing/yaml';

describe('isSupportedFormat', () => {
  const fixtures = path.join(__dirname, 'fixtures', 'format');

  test.each(SUPPORTED_STRING_FORMATS)('should support the string format %o', async format => {
    const filePath = path.join(fixtures, `${format}.yaml`);
    const fileContents = await readFile(filePath);
    const tokens = new yaml.Parser().parse(fileContents);
    const [doc] = new yaml.Composer().compose(tokens);
    const {
      contents: {
        items: [pair],
      },
    } = doc as any;
    expect(isSupportedFormat(pair)).toBeTruthy();
  });

  it('should not support an unsupported string format', async () => {
    const filePath = path.join(fixtures, 'unsupported.yaml');
    const fileContents = await readFile(filePath);
    const tokens = new yaml.Parser().parse(fileContents);
    const [doc] = new yaml.Composer().compose(tokens);
    const {
      contents: {
        items: [pair],
      },
    } = doc as any;
    expect(isSupportedFormat(pair)).toBeFalsy();
  });
});
