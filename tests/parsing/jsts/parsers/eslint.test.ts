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
import { SourceCode } from 'eslint';
import { buildSourceCode } from 'parsing/jsts';
import path from 'path';
import { JsTsAnalysisInput } from 'services/analysis';
import { JsTsLanguage, readFile } from 'helpers';

const cases = [
  { syntax: 'ECMAScript 2015', fixture: 'es2015.js', language: 'js' },
  { syntax: 'ECMAScript 2016', fixture: 'es2016.js', language: 'js' },
  { syntax: 'ECMAScript 2017', fixture: 'es2017.js', language: 'js' },
  { syntax: 'ECMAScript 2018', fixture: 'es2018.js', language: 'js' },
  { syntax: 'ECMAScript 2019', fixture: 'es2019.js', language: 'js' },
  { syntax: 'ECMAScript 2020', fixture: 'es2020.js', language: 'js' },
  { syntax: 'JSX', fixture: 'jsx.jsx', language: 'js' },
  { syntax: 'Flow', fixture: 'flow.js', language: 'js' },
  { syntax: 'Vue.js', fixture: 'vue.vue', language: 'js' },
  { syntax: 'decorator @', fixture: 'decorator.js', language: 'js' },
  { syntax: 'private #', fixture: 'private.js', language: 'js' },
  { syntax: 'TypeScript', fixture: 'typescript.ts', language: 'ts' },
];

describe('ESLint-based parsers', () => {
  test.each(cases)('should parse $syntax syntax', async ({ fixture, language }) => {
    const filePath = path.join(__dirname, 'fixtures', 'eslint', fixture);
    const fileContent = await readFile(filePath);
    const fileType = 'MAIN';

    const input = { filePath, fileType, fileContent } as JsTsAnalysisInput;
    const sourceCode = buildSourceCode(input, language as JsTsLanguage) as SourceCode;

    expect(sourceCode).toBeDefined();
    expect(sourceCode.ast).toBeDefined();
    expect(sourceCode.ast.body.length).toBeGreaterThan(0);
  });
});
