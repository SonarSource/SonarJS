/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile } from '../../../shared/src/helpers/files.js';
import { parseHTML } from '../../src/parser/parse.js';

describe('parseHtml', () => {
  it('should return embedded JavaScript', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'multiple.html');
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
    const filePath = path.join(import.meta.dirname, 'fixtures', 'src.html');
    const fileContent = await readFile(filePath);
    const embeddedJSs = parseHTML(fileContent);
    expect(embeddedJSs).toHaveLength(0);
  });

  it('should ignore non-js script tags', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'non-js.html');
    const fileContent = await readFile(filePath);
    const embeddedJSs = parseHTML(fileContent);
    expect(embeddedJSs).toHaveLength(0);
  });
});
