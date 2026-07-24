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
import { collectPackageImports } from '../src/package-imports.js';

describe('package import telemetry', () => {
  it('normalizes direct npm dependency subpaths', () => {
    const imports = new Set(['react/jsx-runtime', '@angular/core/testing']);
    const dependencies = new Map([
      ['react', '^19.0.0'],
      ['@angular/core', '^20.0.0'],
    ]);

    expect(collectPackageImports(imports, dependencies)).toEqual(
      new Set(['react', '@angular/core']),
    );
  });

  it('accepts inline npm and runtime imports without manifests', () => {
    const imports = new Set([
      'npm:react@19.0.0/jsx-runtime',
      'fs/promises',
      'node:test',
      'bun:test',
    ]);

    expect(collectPackageImports(imports, new Map())).toEqual(
      new Set(['react', 'node:fs/promises', 'node:test', 'bun:test']),
    );
  });

  it('rejects undeclared packages and private module names', () => {
    const imports = new Set([
      'react',
      '@company/private',
      'components/Button',
      './local.js',
      '#internal',
      'https://example.com/module.js',
      'jsr:@std/assert',
      'bun:wrap',
      'sea',
      'sqlite',
      'test',
      'test/reporters',
    ]);

    expect(collectPackageImports(imports, new Map())).toEqual(new Set());
  });
});
