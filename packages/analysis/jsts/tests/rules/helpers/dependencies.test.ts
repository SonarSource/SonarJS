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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { parseReactVersion } from '../../../src/rules/helpers/package-jsons/dependencies.js';

describe('parseReactVersion', () => {
  it('should parse exact versions', () => {
    expect(parseReactVersion('18.0.0')).toBe('18.0.0');
    expect(parseReactVersion('19.1.0')).toBe('19.1.0');
    expect(parseReactVersion('16.14.0')).toBe('16.14.0');
  });

  it('should parse partial versions', () => {
    expect(parseReactVersion('18.0')).toBe('18.0.0');
    expect(parseReactVersion('19')).toBe('19.0.0');
  });

  it('should parse version ranges with caret', () => {
    expect(parseReactVersion('^18.0.0')).toBe('18.0.0');
    expect(parseReactVersion('^19.1.0')).toBe('19.1.0');
    expect(parseReactVersion('^16.8')).toBe('16.8.0');
  });

  it('should parse version ranges with tilde', () => {
    expect(parseReactVersion('~18.0.0')).toBe('18.0.0');
    expect(parseReactVersion('~19.1.0')).toBe('19.1.0');
  });

  it('should parse version ranges with comparison operators', () => {
    expect(parseReactVersion('>=18.0.0')).toBe('18.0.0');
    expect(parseReactVersion('>17.0.0')).toBe('17.0.1');
    expect(parseReactVersion('>=18.0.0 <19.0.0')).toBe('18.0.0');
  });

  it('should parse x-range versions', () => {
    expect(parseReactVersion('18.x')).toBe('18.0.0');
    expect(parseReactVersion('18.*')).toBe('18.0.0');
    expect(parseReactVersion('*')).toBe('0.0.0');
  });

  it('should parse hyphen range versions', () => {
    expect(parseReactVersion('17.0.0 - 19.0.0')).toBe('17.0.0');
  });

  it('should return null for pnpm catalog references', () => {
    expect(parseReactVersion('catalog:')).toBeNull();
    expect(parseReactVersion('catalog:frontend')).toBeNull();
    expect(parseReactVersion('catalog:default')).toBeNull();
  });

  it('should return null for workspace protocol', () => {
    expect(parseReactVersion('workspace:*')).toBeNull();
    expect(parseReactVersion('workspace:^')).toBeNull();
  });

  it('should return null for file protocol', () => {
    expect(parseReactVersion('file:../react')).toBeNull();
    expect(parseReactVersion('file:./packages/react')).toBeNull();
  });

  it('should return null for link protocol', () => {
    expect(parseReactVersion('link:../react')).toBeNull();
  });

  it('should return null for git URLs', () => {
    expect(parseReactVersion('git://github.com/facebook/react.git')).toBeNull();
    expect(parseReactVersion('git+https://github.com/facebook/react.git')).toBeNull();
    expect(parseReactVersion('github:facebook/react')).toBeNull();
  });

  it('should return null for npm aliases', () => {
    expect(parseReactVersion('npm:preact@10.0.0')).toBeNull();
  });

  it('should return null for invalid strings', () => {
    expect(parseReactVersion('invalid')).toBeNull();
    expect(parseReactVersion('not-a-version')).toBeNull();
  });

  it('should handle empty string as wildcard', () => {
    // semver treats empty string like '*' which resolves to 0.0.0
    expect(parseReactVersion('')).toBe('0.0.0');
  });
});
