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
import path from 'path';
import { parseHTML } from '@sonar/html/parser';
import { readFile } from '@sonar/shared/helpers';

describe('parseHtml', () => {
  it('should return embedded JavaScript', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'multiple.html');
    const fileContent = await readFile(filePath);
    const embeddedJSs = parseHTML(fileContent);
    expect(embeddedJSs).toHaveLength(2);
    const [embeddedJS1, embeddedJS2] = embeddedJSs;
    expect(embeddedJS1).toEqual(
      expect.objectContaining({
        code: 'f(x)',
        line: 4,
        column: 9,
        offset: 38,
        lineStarts: [0, 16, 23, 30, 52, 53, 69, 70, 92, 100, 108],
        text: fileContent,
      }),
    );
    expect(embeddedJS2).toEqual(
      expect.objectContaining({
        code: 'g(x)',
        line: 8,
        column: 9,
        offset: 78,
        lineStarts: [0, 16, 23, 30, 52, 53, 69, 70, 92, 100, 108],
        text: fileContent,
      }),
    );
  });

  it('should ignore script tags with the "src" attribute', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'src.html');
    const fileContent = await readFile(filePath);
    const embeddedJSs = parseHTML(fileContent);
    expect(embeddedJSs).toHaveLength(0);
  });

  it('should ignore non-js script tags', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'non-js.html');
    const fileContent = await readFile(filePath);
    const embeddedJSs = parseHTML(fileContent);
    expect(embeddedJSs).toHaveLength(0);
  });
});
