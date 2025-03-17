/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { describe, test } from 'node:test';
import { expect } from 'expect';
import { type FileType, readFile } from '../../../shared/src/helpers/files.js';
import { build } from '../../src/builders/build.js';
import type { JsTsLanguage } from '../../../shared/src/helpers/configuration.js';

const cases: { syntax: string; fixture: string; language: JsTsLanguage }[] = [
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
  cases.forEach(({ syntax, fixture, language }) => {
    test(`should parse ${syntax} syntax`, async () => {
      const filePath = path.join(import.meta.dirname, 'fixtures', 'eslint', fixture);
      const fileContent = await readFile(filePath);
      const fileType: FileType = 'MAIN';

      const input = { filePath, fileType, fileContent, language };
      const sourceCode = build(input).sourceCode;

      expect(sourceCode).toBeDefined();
      expect(sourceCode.ast).toBeDefined();
      expect(sourceCode.ast.body.length).toBeGreaterThan(0);
    });
  });
});
