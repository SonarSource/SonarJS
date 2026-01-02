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

/**
 * CRITICAL FINDINGS: How TypeScript's configFilePath affects @types resolution
 *
 * This test suite comprehensively tracks ALL CompilerHost method calls to understand
 * how TypeScript resolves @types packages in different scenarios.
 *
 * KEY DISCOVERY:
 * TypeScript uses `dirname(configFilePath)` as the starting point for @types resolution
 * when configFilePath is set in compiler options. This is contrary to initial assumptions
 * that only host.getCurrentDirectory() matters.
 *
 * DETAILED FINDINGS:
 *
 * 1. @types Resolution Strategy:
 *    - When configFilePath is SET: TypeScript searches from dirname(configFilePath) upwards
 *    - When configFilePath is UNDEFINED: TypeScript searches from host.getCurrentDirectory() upwards
 *    - The basePath parameter does NOT affect @types resolution (only used for include/exclude patterns)
 *
 * 2. Empirical Evidence from Method Tracking:
 *
 *    Scenario A: WITH configFilePath OUTSIDE process.cwd() (/project/root/tsconfig.json)
 *    - Total method calls: 2,388
 *    - getCurrentDirectory() calls: 1 (returns C:\www\projects\SonarJS)
 *    - directoryExists() calls: 757
 *    - directoryExists() with @types: 3
 *      * Searches: /project/root/node_modules/@types => false
 *      * Searches: /project/node_modules/@types => false
 *      * Searches: /node_modules/@types => false
 *    - Result: @types/node NOT FOUND
 *
 *    Scenario B: WITHOUT configFilePath (undefined)
 *    - Total method calls: 11,758 (almost 5x more!)
 *    - getCurrentDirectory() calls: 39 (all return C:\www\projects\SonarJS)
 *    - directoryExists() calls: 3,439
 *    - directoryExists() with @types: 1,537 (over 500x more!)
 *      * First search: C:/www/projects/SonarJS/node_modules/@types => true ✓
 *      * Then searches each @types package: babel__preset-env, body-parser, express, node, etc.
 *    - fileExists() calls: 3,502 (checking package.json for each @types package)
 *    - readFile() calls: 263 (reading package.json and .d.ts files)
 *    - realpath() calls: 112 (only in this scenario!)
 *    - Result: @types/node FOUND
 *
 *    Scenario C: WITH configFilePath INSIDE process.cwd() (c:/www/projects/SonarJS/packages/jsts/tsconfig.json)
 *    - Total method calls: 11,996 (similar to scenario B)
 *    - getCurrentDirectory() calls: 1 (returns C:\www\projects\SonarJS)
 *    - directoryExists() calls: 3,715
 *    - directoryExists() with @types: 1,537+
 *      * First search: c:/www/projects/SonarJS/packages/jsts/node_modules/@types => false
 *      * Second search: c:/www/projects/SonarJS/node_modules/@types => true ✓
 *      * Then searches each @types package like scenario B
 *    - Result: @types/node FOUND
 *
 * 3. Why the Dramatic Difference in Method Calls?
 *    The 5x increase in method calls (2,388 vs 11,758) happens because:
 *    - When @types/node is NOT found: TypeScript loads only 7 source files + TypeScript lib files
 *    - When @types/node IS found: TypeScript loads ~25+ @types packages, each requiring hundreds
 *      of file system operations to read package.json, type definition files, and resolve dependencies
 *
 * 4. CompilerHost Behavior:
 *    - host.getCurrentDirectory() ALWAYS returns process.cwd(), regardless of configFilePath
 *    - But TypeScript internally uses configFilePath to determine the search starting point
 *    - The first 100 method calls are nearly IDENTICAL across all scenarios
 *    - Divergence occurs when TypeScript begins searching for @types packages
 *
 * 5. Practical Implications:
 *    - If you want @types resolution to work: ensure configFilePath points to a location
 *      that has node_modules/@types in its parent hierarchy
 *    - Setting configFilePath to a location outside your project will break @types resolution
 *    - Setting configFilePath to undefined causes TypeScript to use process.cwd() as fallback
 *    - The basePath parameter in ts.parseJsonConfigFileContent() does NOT affect this behavior
 *
 * 6. Methods Called (in order of frequency, scenario B):
 *    - getCanonicalFileName: 3,842 calls (file path normalization)
 *    - fileExists: 3,502 calls (checking if files exist)
 *    - directoryExists: 3,439 calls (checking if directories exist)
 *    - useCaseSensitiveFileNames: 354 calls
 *    - readFile: 263 calls (reading file contents)
 *    - getSourceFile: 204 calls (creating SourceFile objects)
 *    - realpath: 112 calls (resolving symlinks)
 *    - getCurrentDirectory: 39 calls
 *    - getDefaultLibLocation: 1 call
 *    - getDirectories: 1 call
 *    - getDefaultLibFileName: 1 call
 *
 * CONCLUSION:
 * The configFilePath parameter (5th parameter of ts.parseJsonConfigFileContent) has a MAJOR
 * effect on @types resolution. It determines WHERE TypeScript starts searching for node_modules/@types.
 * This behavior is NOT documented clearly in TypeScript's official documentation and was discovered
 * through comprehensive empirical testing by monitoring every single CompilerHost method call.
 */

import { describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';

interface MethodCall {
  method: string;
  args: any[];
  result: any;
}

function safeStringify(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'object') {
    // Check for circular references by trying to stringify
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Circular or Complex Object]';
    }
  }
  return String(value);
}

function createFullyMonitoredHost(options: ts.CompilerOptions, label: string) {
  const host = ts.createCompilerHost(options);
  const calls: MethodCall[] = [];

  // Get all property names from the host
  const allProps = new Set<string>();
  let obj = host;
  while (obj && obj !== Object.prototype) {
    Object.getOwnPropertyNames(obj).forEach(prop => allProps.add(prop));
    obj = Object.getPrototypeOf(obj);
  }

  // Wrap every function
  allProps.forEach(prop => {
    if (typeof (host as any)[prop] === 'function' && prop !== 'constructor') {
      const original = (host as any)[prop];
      (host as any)[prop] = function (...args: any[]) {
        const result = original.apply(this, args);
        calls.push({ method: prop, args: [...args], result });
        return result;
      };
    }
  });

  return { host, calls, label };
}

describe('Comprehensive CompilerHost method tracking', () => {
  const testFile =
    'c:/www/projects/sonarjs-ruling-sources/jsts/projects/Ghost/core/server/config/index.js';

  interface TestScenario {
    name: string;
    configFilePath: string | undefined;
    basePath: string;
    expectedHasNodeTypes: boolean;
  }

  const scenarios: TestScenario[] = [
    {
      name: 'WITH configFilePath OUTSIDE process.cwd()',
      configFilePath: '/project/root/tsconfig.json',
      basePath: '/project/root',
      expectedHasNodeTypes: false,
    },
    {
      name: 'WITHOUT configFilePath',
      configFilePath: undefined,
      basePath: '/project/root',
      expectedHasNodeTypes: true,
    },
    {
      name: 'WITH configFilePath INSIDE process.cwd()',
      configFilePath: 'c:/www/projects/SonarJS/packages/jsts/tsconfig.json',
      basePath: 'c:/www/projects/SonarJS/packages/jsts',
      expectedHasNodeTypes: true,
    },
  ];

  scenarios.forEach(scenario => {
    it(`should track all method calls: ${scenario.name}`, () => {
      const parsed = ts.parseJsonConfigFileContent(
        { compilerOptions: { target: 'ES2020', allowJs: true, noEmit: true } },
        ts.sys,
        scenario.basePath,
        {},
        scenario.configFilePath,
      );

      const monitored = createFullyMonitoredHost(parsed.options, scenario.name);

      const program = ts.createProgram({
        rootNames: [testFile],
        options: parsed.options,
        host: monitored.host,
      });

      const hasNodeTypes = program
        .getSourceFiles()
        .some(sf => sf.fileName.includes('node_modules/@types/node'));

      // Expectations about method calls
      const getCurrentDirectoryCalls = monitored.calls.filter(
        c => c.method === 'getCurrentDirectory',
      );
      const directoryExistsCalls = monitored.calls.filter(c => c.method === 'directoryExists');
      const fileExistsCalls = monitored.calls.filter(c => c.method === 'fileExists');
      const readFileCalls = monitored.calls.filter(c => c.method === 'readFile');

      console.log(`\n=== ${scenario.name} ===`);
      console.log('configFilePath:', scenario.configFilePath || 'undefined');
      console.log('Total method calls:', monitored.calls.length);

      // Group by method name
      const methodGroups = new Map<string, MethodCall[]>();
      monitored.calls.forEach(call => {
        if (!methodGroups.has(call.method)) {
          methodGroups.set(call.method, []);
        }
        methodGroups.get(call.method)!.push(call);
      });

      console.log('\nMethod call breakdown:');
      Array.from(methodGroups.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([method, calls]) => {
          console.log(`  ${method}: ${calls.length} calls`);
        });

      // Show first 100 calls in chronological order
      console.log('\nFirst 100 method calls (chronological):');
      monitored.calls.slice(0, 100).forEach((call, i) => {
        const argStr = call.args
          .map((arg: any) => {
            if (typeof arg === 'string') {
              return arg.length > 80 ? `"${arg.substring(0, 77)}..."` : `"${arg}"`;
            }
            const str = safeStringify(arg);
            return str.length > 80 ? `${str.substring(0, 77)}...` : str;
          })
          .join(', ');
        const resultStr =
          typeof call.result === 'string'
            ? call.result.length > 50
              ? `"${call.result.substring(0, 47)}..."`
              : `"${call.result}"`
            : safeStringify(call.result);
        console.log(`  [${i}] ${call.method}(${argStr}) => ${resultStr}`);
      });
      if (monitored.calls.length > 100) {
        console.log(`  ... and ${monitored.calls.length - 100} more calls`);
      }

      console.log('\nAll getCurrentDirectory calls:', getCurrentDirectoryCalls.length);
      getCurrentDirectoryCalls.forEach((call, i) => {
        console.log(`  [${i}] getCurrentDirectory() => "${call.result}"`);
      });

      console.log('\nAll directoryExists calls:', directoryExistsCalls.length);
      directoryExistsCalls.slice(0, 50).forEach((call, i) => {
        console.log(`  [${i}] directoryExists("${call.args[0]}") => ${call.result}`);
      });
      if (directoryExistsCalls.length > 50) {
        console.log(`  ... and ${directoryExistsCalls.length - 50} more`);
      }

      console.log('\nAll fileExists calls:', fileExistsCalls.length);
      fileExistsCalls.slice(0, 50).forEach((call, i) => {
        console.log(`  [${i}] fileExists("${call.args[0]}") => ${call.result}`);
      });
      if (fileExistsCalls.length > 50) {
        console.log(`  ... and ${fileExistsCalls.length - 50} more`);
      }

      console.log('\nAll readFile calls:', readFileCalls.length);
      readFileCalls.slice(0, 30).forEach((call, i) => {
        console.log(
          `  [${i}] readFile("${call.args[0]}") => ${call.result ? 'success' : 'undefined'}`,
        );
      });
      if (readFileCalls.length > 30) {
        console.log(`  ... and ${readFileCalls.length - 30} more`);
      }

      console.log('\nFound @types/node:', hasNodeTypes);

      // Analyze directoryExists calls for @types
      const typesDirCalls = directoryExistsCalls.filter(c => String(c.args[0]).includes('@types'));
      console.log('directoryExists calls with @types:', typesDirCalls.length);
      if (typesDirCalls.length > 0) {
        console.log('First @types check:', typesDirCalls[0].args[0], '=>', typesDirCalls[0].result);
      }

      // Analyze what directories were checked
      const checkedForNodeModules = directoryExistsCalls.filter(c =>
        String(c.args[0]).includes('node_modules'),
      );
      const uniqueDirs = new Set(
        checkedForNodeModules.map(c => String(c.args[0]).replace(/\/node_modules.*/, '')),
      );
      console.log('\nUnique directories searched for node_modules:');
      [...uniqueDirs].slice(0, 5).forEach(dir => console.log('  ', dir));

      // Store for comparison
      expect(hasNodeTypes).toBe(scenario.expectedHasNodeTypes);
      expect(getCurrentDirectoryCalls.length).toBeGreaterThan(0);
      expect(directoryExistsCalls.length).toBeGreaterThan(0);

      return { calls: monitored.calls, hasNodeTypes, typesDirCalls };
    });
  });

  it('should compare the two scenarios and make specific assertions', () => {
    // Scenario 1: WITH configFilePath
    const parsed1 = ts.parseJsonConfigFileContent(
      { compilerOptions: { target: 'ES2020', allowJs: true, noEmit: true } },
      ts.sys,
      '/project/root',
      {},
      '/project/root/tsconfig.json',
    );
    const monitored1 = createFullyMonitoredHost(parsed1.options, 'WITH');
    const program1 = ts.createProgram({
      rootNames: [testFile],
      options: parsed1.options,
      host: monitored1.host,
    });
    const hasNodeTypes1 = program1
      .getSourceFiles()
      .some(sf => sf.fileName.includes('node_modules/@types/node'));

    // Scenario 2: WITHOUT configFilePath
    const parsed2 = ts.parseJsonConfigFileContent(
      { compilerOptions: { target: 'ES2020', allowJs: true, noEmit: true } },
      ts.sys,
      '/project/root',
      {},
      undefined,
    );
    const monitored2 = createFullyMonitoredHost(parsed2.options, 'WITHOUT');
    const program2 = ts.createProgram({
      rootNames: [testFile],
      options: parsed2.options,
      host: monitored2.host,
    });
    const hasNodeTypes2 = program2
      .getSourceFiles()
      .some(sf => sf.fileName.includes('node_modules/@types/node'));

    // ASSERTIONS

    // 1. Different outcomes for @types/node resolution
    expect(hasNodeTypes1).toBe(false);
    expect(hasNodeTypes2).toBe(true);

    // 2. getCurrentDirectory is called in both cases
    const getCurrentDir1 = monitored1.calls.filter(c => c.method === 'getCurrentDirectory');
    const getCurrentDir2 = monitored2.calls.filter(c => c.method === 'getCurrentDirectory');
    expect(getCurrentDir1.length).toBeGreaterThan(0);
    expect(getCurrentDir2.length).toBeGreaterThan(0);

    // 3. getCurrentDirectory returns the same value in both cases (process.cwd())
    if (getCurrentDir1.length > 0 && getCurrentDir2.length > 0) {
      expect(getCurrentDir1[0].result).toBe(getCurrentDir2[0].result);
      expect(getCurrentDir1[0].result).toBe(process.cwd());
    }

    // 4. directoryExists is called with different paths
    const dirExists1 = monitored1.calls.filter(c => c.method === 'directoryExists');
    const dirExists2 = monitored2.calls.filter(c => c.method === 'directoryExists');
    expect(dirExists1.length).toBeGreaterThan(0);
    expect(dirExists2.length).toBeGreaterThan(0);

    // 5. Look for @types directory checks
    const typesCheck1 = dirExists1.filter(c => String(c.args[0]).includes('node_modules/@types'));
    const typesCheck2 = dirExists2.filter(c => String(c.args[0]).includes('node_modules/@types'));

    console.log('\n=== COMPARISON ===');
    console.log('WITH configFilePath:');
    console.log('  @types directory checks:', typesCheck1.length);
    if (typesCheck1.length > 0) {
      console.log('  First check:', typesCheck1[0].args[0], '=>', typesCheck1[0].result);
    }

    console.log('\nWITHOUT configFilePath:');
    console.log('  @types directory checks:', typesCheck2.length);
    if (typesCheck2.length > 0) {
      console.log('  First check:', typesCheck2[0].args[0], '=>', typesCheck2[0].result);
    }

    // 6. The key difference: WHERE TypeScript looks for @types
    if (typesCheck1.length > 0) {
      // WITH configFilePath: should check /project/root and parent directories
      expect(typesCheck1.some(c => String(c.args[0]).includes('/project'))).toBe(true);
    }

    if (typesCheck2.length > 0) {
      // WITHOUT configFilePath: should check process.cwd() and parent directories
      const cwdNormalized = process.cwd().toLowerCase().replace(/\\/g, '/');
      expect(
        typesCheck2.some(c =>
          String(c.args[0]).toLowerCase().replace(/\\/g, '/').includes(cwdNormalized),
        ),
      ).toBe(true);
    }

    // 7. More calls to getCurrentDirectory without configFilePath
    // (because TypeScript may use it more frequently as fallback)
    expect(getCurrentDir2.length).toBeGreaterThanOrEqual(getCurrentDir1.length);
  });
});
