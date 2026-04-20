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
import path from 'node:path';
import { stripBOM } from '../../../../src/jsts/rules/helpers/files.js';
import { readFile } from 'node:fs/promises';
import { expect } from 'expect';
import {
  getDependenciesFromManifest,
  getDependenciesFromPackageJson,
  parseDenoManifest,
  parseImportMapSpecifier,
} from '../../../../src/jsts/rules/helpers/dependency-manifests/parse.js';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';

describe('package-json', () => {
  it('should handle arrays in package-jsons dependency versions', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'package.json');
    const fileContent = JSON.parse(stripBOM(await readFile(filePath, 'utf8')));
    const dependencies = getDependenciesFromPackageJson(fileContent);
    expect(dependencies).toEqual(
      new Set([
        {
          name: 'foo',
          version: 'file:bar',
        },
      ]),
    );
  });

  it('should extract npm package dependencies from deno.json imports', () => {
    const dependencies = getDependenciesFromManifest({
      type: 'deno',
      manifest: {
        imports: {
          reactAlias: 'npm:react@^19.1.0',
          utils: 'jsr:@std/assert@^1.0.0',
          lodashFp: 'npm:lodash@^4.17.21/fp',
          remote: 'https://deno.land/x/case/mod.ts',
          scopedAlias: 'npm:@scope/package@~2.0.0',
          noVersion: 'npm:chalk',
          invalidVersion: 'npm:koa@not-a-semver',
        },
      },
    });

    expect(dependencies).toEqual(
      new Set([
        { name: 'react', version: '^19.1.0', alias: 'reactAlias' },
        { name: 'lodash', version: '^4.17.21', alias: 'lodashFp' },
        { name: '@scope/package', version: '~2.0.0', alias: 'scopedAlias' },
        { name: 'chalk', version: undefined, alias: 'noVersion' },
        { name: 'koa', version: 'not-a-semver', alias: 'invalidVersion' },
      ]),
    );
  });

  it('should parse deno.jsonc with comments and trailing commas', () => {
    const manifest = parseDenoManifest({
      path: normalizeToAbsolutePath('/project/deno.jsonc'),
      content: Buffer.from(`{
        // Trailing comma and comments should be accepted
        "imports": {
          "reactAlias": "npm:react@^19.1.0",
        },
      }`),
    });

    expect(manifest).toEqual({
      imports: {
        reactAlias: 'npm:react@^19.1.0',
      },
    });

    const dependencies = getDependenciesFromManifest({
      type: 'deno',
      manifest: manifest ?? {},
    });

    expect(dependencies).toEqual(
      new Set([{ name: 'react', version: '^19.1.0', alias: 'reactAlias' }]),
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
