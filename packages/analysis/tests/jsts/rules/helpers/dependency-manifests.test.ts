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
import { parseInlineNPMImport } from '../../../../src/jsts/rules/helpers/dependency-manifests/resolvers/deno.js';
import {
  setCurrentFileInlineDependencies,
  withCurrentFileInlineDependencies,
} from '../../../../src/jsts/rules/helpers/dependency-manifests/dependencies.js';

describe('package-json', () => {
  it('should handle arrays in package-jsons dependency versions', async () => {
    const currentDirectory = normalizeToAbsolutePath(path.join(import.meta.dirname, 'fixtures'));
    const manifests = getDependencyManifests(currentDirectory, currentDirectory);
    const npmManifest = manifests.find(({ type }) => type === 'npm');
    expect(npmManifest?.type).toBe('npm');
    expect(npmManifest?.dependencies).toEqual(new Map([['foo', 'file:bar']]));
  });

  it('should extract npm package dependencies from deno.json imports', () => {
    const currentDirectory = normalizeToAbsolutePath(path.join(import.meta.dirname, 'fixtures'));
    const manifests = getDependencyManifests(currentDirectory, currentDirectory);
    const denoManifest = manifests.find(({ type }) => type === 'deno');
    expect(denoManifest?.type).toBe('deno');
    expect(denoManifest?.dependencies).toEqual(
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
        ['@scope/subpkg', '1.0.0'],
        ['scopedSubpathAlias', '1.0.0'],
        ['@scope/noversion', undefined],
        ['scopedNoVersionAlias', undefined],
        ['cowsay', undefined],
        ['emptyVersionAlias', undefined],
        // 'invalidScoped' ("npm:@scope") is filtered out — not added to the map
      ]),
    );
  });
});

describe('parseInlineNPMImport', () => {
  it('should parse package with version', () => {
    expect(parseInlineNPMImport('npm:zod@4.3.6')).toEqual({
      packageName: 'zod',
      version: '4.3.6',
    });
  });

  it('should parse scoped package with version and subpath', () => {
    expect(parseInlineNPMImport('npm:@scope/pkg@1.2.3/subpath')).toEqual({
      packageName: '@scope/pkg',
      version: '1.2.3',
    });
  });

  it('should return undefined for jsr package specifiers', () => {
    expect(parseInlineNPMImport('jsr:@std/assert@^1.0.0')).toBeUndefined();
  });

  it('should return undefined for https package specifiers', () => {
    expect(parseInlineNPMImport('https://example.com/package')).toBeUndefined();
  });
});

describe('withCurrentFileInlineDependencies', () => {
  it('should register the version of inline imports in the merged map', () => {
    setCurrentFileInlineDependencies(new Map([['react', '18.2.0']]));
    try {
      const merged = withCurrentFileInlineDependencies(new Map());
      expect(merged.get('react')).toBe('18.2.0');
    } finally {
      setCurrentFileInlineDependencies(null);
    }
  });

  it('should preserve undefined version for inline imports without a version', () => {
    setCurrentFileInlineDependencies(new Map([['react', undefined]]));
    try {
      const merged = withCurrentFileInlineDependencies(new Map());
      expect(merged.has('react')).toBe(true);
      expect(merged.get('react')).toBeUndefined();
    } finally {
      setCurrentFileInlineDependencies(null);
    }
  });

  it('should give precedence to the inline version over the manifest version on conflict', () => {
    setCurrentFileInlineDependencies(new Map([['react', '19.1.0']]));
    try {
      const merged = withCurrentFileInlineDependencies(new Map([['react', '^18.0.0']]));
      expect(merged.get('react')).toBe('19.1.0');
    } finally {
      setCurrentFileInlineDependencies(null);
    }
  });

  it('should preserve unrelated manifest entries when merging', () => {
    setCurrentFileInlineDependencies(new Map([['zod', '4.3.6']]));
    try {
      const merged = withCurrentFileInlineDependencies(new Map([['react', '^18.0.0']]));
      expect(merged.get('react')).toBe('^18.0.0');
      expect(merged.get('zod')).toBe('4.3.6');
    } finally {
      setCurrentFileInlineDependencies(null);
    }
  });

  it('should return the manifest unchanged when there are no inline imports', () => {
    setCurrentFileInlineDependencies(null);
    const manifest = new Map([['react', '^18.0.0']]);
    expect(withCurrentFileInlineDependencies(manifest)).toBe(manifest);
  });
});
