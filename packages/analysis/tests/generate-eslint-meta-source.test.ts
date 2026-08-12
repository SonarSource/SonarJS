/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { shouldSkipOnGeneratedSource } from '../src/jsts/rules/helpers/generated-source.js';

describe('generated-source RSPEC metadata', () => {
  it('should enable generated-source suppression for editable-source rules', () => {
    expect(shouldSkipOnGeneratedSource(['editable-source'])).toBe(true);
  });

  it('should keep generated-source suppression disabled when editable-source tag is absent', () => {
    expect(shouldSkipOnGeneratedSource(['es2022', 'type-dependent'])).toBe(false);
  });
});

describe('generated ESLint metadata source', () => {
  it('should preserve TypeScript parser requirements from local metadata', async () => {
    const rulesFolder = fileURLToPath(new URL('../src/jsts/rules/', import.meta.url));
    const [s1481, s100] = await Promise.all([
      readFile(`${rulesFolder}S1481/generated-meta.ts`, 'utf8'),
      readFile(`${rulesFolder}S100/generated-meta.ts`, 'utf8'),
    ]);

    expect(s1481).toContain('export const requiresTypeScriptParser = true;');
    expect(s100).not.toContain('requiresTypeScriptParser');
  });
});
