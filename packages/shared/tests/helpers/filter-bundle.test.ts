/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { filterBundle } from '../../src/helpers/filter/filter-bundle.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { normalizeToAbsolutePath } from '../../src/helpers/files.js';

describe('filter bundle', () => {
  it('should return true for a bundle file', () => {
    const BUNDLE_CONTENTS = '/* jQuery JavaScript Library v1.4.3*/(function(';
    expect(filterBundle(normalizeToAbsolutePath('/test.ts'), BUNDLE_CONTENTS)).toBeFalsy();
  });
  it('should return false for a non-bundled file', () => {
    const CONTENTS = 'contents';
    expect(filterBundle(normalizeToAbsolutePath('/test.ts'), CONTENTS)).toBeTruthy();
  });
});
