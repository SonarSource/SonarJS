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
import { filterBundle, filterBundleCode } from '../../src/helpers/filter/filter-bundle.js';
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

describe('filterBundleCode', () => {
  it('should return false for jQuery-style bundle', () => {
    const bundleCode = '/* jQuery JavaScript Library v1.4.3*/(function(';
    expect(filterBundleCode(bundleCode)).toBe(false);
  });

  it('should return false for minified bundle with exclamation mark', () => {
    const bundleCode = '/*! jQuery v3.5.1 | (c) JS Foundation */!function(e,t){"use strict";}';
    expect(filterBundleCode(bundleCode)).toBe(false);
  });

  it('should return false for bundle with semicolon operator', () => {
    const bundleCode = '/* bundle */;function test(){}';
    expect(filterBundleCode(bundleCode)).toBe(false);
  });

  it('should return false for bundle with plus operator', () => {
    const bundleCode = '/* bundle */+function(){}';
    expect(filterBundleCode(bundleCode)).toBe(false);
  });

  it('should return false for bundle with parenthesis operator', () => {
    const bundleCode = '/* bundle */(function(){}';
    expect(filterBundleCode(bundleCode)).toBe(false);
  });

  it('should return true for normal code', () => {
    const normalCode = 'function hello() { console.log("hello"); }';
    expect(filterBundleCode(normalCode)).toBe(true);
  });

  it('should return true for code with comment but no bundle pattern', () => {
    const normalCode = '/* This is a comment */ const x = 1;';
    expect(filterBundleCode(normalCode)).toBe(true);
  });

  it('should return true for empty code', () => {
    expect(filterBundleCode('')).toBe(true);
  });
});
