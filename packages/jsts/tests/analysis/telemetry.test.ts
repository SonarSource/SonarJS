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
import { beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import { ProjectAnalysisTelemetryCollector } from '../../src/analysis/projectAnalysis/telemetry.js';
import { packageJsonStore } from '../../src/analysis/projectAnalysis/file-stores/index.js';

describe('project analysis telemetry', () => {
  beforeEach(() => {
    packageJsonStore.clearCache();
  });

  it('should normalize and merge compiler options across programs', () => {
    const collector = new ProjectAnalysisTelemetryCollector();
    collector.recordCompilerOptions({
      lib: ['lib.es2022.d.ts', 'dom'],
      jsxImportSource: '@emotion/react',
      module: ts.ModuleKind.CommonJS,
      strict: true,
      types: ['@types/node'],
      paths: { '@/*': ['src/*'] },
    });
    collector.recordCompilerOptions({
      lib: ['lib.es2020.d.ts', 'dom'],
      module: ts.ModuleKind.NodeNext,
      strict: true,
    });

    expect(collector.getTelemetry().compilerOptions).toEqual({
      jsxImportSource: ['@emotion/react'],
      lib: ['dom', 'es2020', 'es2022'],
      module: ['commonjs', 'nodenext'],
      strict: ['true'],
      types: ['@types/node'],
    });
  });

  it('should ignore compiler option values that cannot be JSON stringified', () => {
    const collector = new ProjectAnalysisTelemetryCollector();
    collector.recordCompilerOptions({
      customOption: Symbol('custom'),
    } as unknown as ts.CompilerOptions);
    collector.recordCompilerOptions({ customOption: undefined } as unknown as ts.CompilerOptions);

    expect(collector.getTelemetry().compilerOptions.customOption).toBeUndefined();
  });

  it('should skip non-allowlisted compiler options', () => {
    const collector = new ProjectAnalysisTelemetryCollector();
    collector.recordCompilerOptions({
      rootDir: '/home/user/project/src',
      rootDirs: ['/home/user/project/src', '/home/user/project/generated'],
      baseUrl: 'C:\\workspace\\project',
      outDir: 'file:///var/project/dist',
      paths: { '@/*': ['/Users/jane/project/src/*'] },
      customOption: '/tmp/absolute-path',
      customRelativeOption: 'src/relative-path',
      customNonPathOption: 'keep-me',
    } as unknown as ts.CompilerOptions);

    expect(collector.getTelemetry().compilerOptions.paths).toBeUndefined();
    expect(collector.getTelemetry().compilerOptions.customOption).toBeUndefined();
    expect(collector.getTelemetry().compilerOptions.customRelativeOption).toBeUndefined();
    expect(collector.getTelemetry().compilerOptions.customNonPathOption).toBeUndefined();
    expect(collector.getTelemetry().compilerOptions.rootDir).toBeUndefined();
    expect(collector.getTelemetry().compilerOptions.rootDirs).toBeUndefined();
    expect(collector.getTelemetry().compilerOptions.baseUrl).toBeUndefined();
    expect(collector.getTelemetry().compilerOptions.outDir).toBeUndefined();
  });

  it('should keep path-like strings for allowlisted compiler options', () => {
    const collector = new ProjectAnalysisTelemetryCollector();
    collector.recordCompilerOptions({
      jsxImportSource: '../my-jsx-runtime',
      types: ['./types', '/abs/types', 'C:\\workspace\\types'],
    });

    expect(collector.getTelemetry().compilerOptions.jsxImportSource).toEqual(['../my-jsx-runtime']);
    expect(collector.getTelemetry().compilerOptions.types).toEqual([
      './types',
      '/abs/types',
      'C:\\workspace\\types',
    ]);
  });

  it('should not throw on malformed allowlisted compiler options', () => {
    const collector = new ProjectAnalysisTelemetryCollector();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      collector.recordCompilerOptions({
        jsxImportSource: circular as unknown as string,
        strict: true,
      }),
    ).not.toThrow();

    expect(collector.getTelemetry().compilerOptions).toEqual({
      strict: ['true'],
    });
  });
});
