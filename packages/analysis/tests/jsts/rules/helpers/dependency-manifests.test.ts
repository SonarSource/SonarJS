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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { normalizeToAbsolutePath } from '../../../../src/jsts/rules/helpers/files.js';
import { getDependencyManifests } from '../../../../src/jsts/rules/helpers/dependency-manifests/all-in-parent-dirs.js';
import { parseImportMapSpecifier } from '../../../../src/jsts/rules/helpers/dependency-manifests/resolvers/deno.js';

describe('package-json', () => {
  it('should handle arrays in package-jsons dependency versions', async () => {
    const currentDirectory = normalizeToAbsolutePath(path.join(import.meta.dirname, 'fixtures'));
    const manifests = getDependencyManifests(currentDirectory, currentDirectory);
    const npmManifest = manifests.find(({ type }) => type === 'npm');
    expect(npmManifest?.type).toBe('npm');
    expect(npmManifest?.getDependencies()).toEqual(new Map([['foo', 'file:bar']]));
  });

  it('should extract npm package dependencies from deno.json imports', () => {
    const currentDirectory = normalizeToAbsolutePath(path.join(import.meta.dirname, 'fixtures'));
    const manifests = getDependencyManifests(currentDirectory, currentDirectory);
    const denoManifest = manifests.find(({ type }) => type === 'deno');
    expect(denoManifest?.type).toBe('deno');
    expect(denoManifest?.getDependencies()).toEqual(
      new Map([
        ['react', '^19.1.0'],
        ['reactAlias', '^19.1.0'],
        ['lodash', '^4.17.21'],
        ['lodashFp', '^4.17.21'],
        ['@scope/package', '~2.0.0'],
        ['scopedAlias', '~2.0.0'],
        ['chalk', undefined],
        ['noVersion', undefined],
        ['koa', 'not-a-semver'],
        ['invalidVersion', 'not-a-semver'],
      ]),
    );
  });
});

describe('parseImportMapSpecifier', () => {
  it('should parse unscoped package without version', () => {
    expect(parseImportMapSpecifier('npm:chalk')).toEqual({
      packageName: 'chalk',
      version: undefined,
    });
  });

  it('should parse unscoped package with version and subpath', () => {
    expect(parseImportMapSpecifier('npm:lodash@^4.17.21/fp')).toEqual({
      packageName: 'lodash',
      version: '^4.17.21',
    });
  });

  it('should parse scoped package with version and subpath', () => {
    expect(parseImportMapSpecifier('npm:@scope/package@~2.0.0/feature')).toEqual({
      packageName: '@scope/package',
      version: '~2.0.0',
    });
  });

  it('should parse scoped package with subpath and no version', () => {
    expect(parseImportMapSpecifier('npm:@scope/package/utils')).toEqual({
      packageName: '@scope/package',
      version: undefined,
    });
  });

  it('should return undefined for missing scheme separator', () => {
    expect(parseImportMapSpecifier('react@19')).toBeUndefined();
  });

  it('should return undefined for empty specifier', () => {
    expect(parseImportMapSpecifier('npm:')).toBeUndefined();
  });

  it('should return undefined for non-npm package specifiers', () => {
    expect(parseImportMapSpecifier('jsr:@std/assert@^1.0.0')).toBeUndefined();
  });

  it('should return undefined for URL targets', () => {
    expect(parseImportMapSpecifier('https://deno.land/x/case/mod.ts')).toBeUndefined();
  });

  it('should return undefined for invalid scoped package format', () => {
    expect(parseImportMapSpecifier('npm:@scope')).toBeUndefined();
  });

  it('should return package without version when version is empty', () => {
    expect(parseImportMapSpecifier('npm:react@')).toEqual({
      packageName: 'react',
      version: undefined,
    });
  });
  it('should return package without version when version is empty before path', () => {
    expect(parseImportMapSpecifier('npm:react@/jsx-runtime')).toEqual({
      packageName: 'react',
      version: undefined,
    });
  });
});
