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
import { shouldSkipOnGeneratedSource } from '../src/jsts/rules/helpers/generated-source.js';
import * as s100 from '../src/jsts/rules/S100/generated-meta.js';
import * as s1481 from '../src/jsts/rules/S1481/generated-meta.js';

describe('generated-source RSPEC metadata', () => {
  it('should enable generated-source suppression for editable-source rules', () => {
    expect(shouldSkipOnGeneratedSource(['editable-source'])).toBe(true);
  });

  it('should keep generated-source suppression disabled when editable-source tag is absent', () => {
    expect(shouldSkipOnGeneratedSource(['es2022', 'type-dependent'])).toBe(false);
  });
});

describe('generated ESLint metadata source', () => {
  it('should preserve TypeScript parser requirements from local metadata', () => {
    expect(s1481.requiresTypeScriptParser).toBe(true);
    expect('requiresTypeScriptParser' in s100).toBe(false);
  });
});
