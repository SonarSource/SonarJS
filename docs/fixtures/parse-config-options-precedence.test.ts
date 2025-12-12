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
 * CRITICAL FINDINGS: How ts.parseJsonConfigFileContent merges compiler options
 *
 * Tests to understand how ts.parseJsonConfigFileContent handles compiler options
 * passed in different parameters.
 *
 * Parameters of ts.parseJsonConfigFileContent:
 * 1. json: any - The tsconfig.json content (including compilerOptions)
 * 2. host: ParseConfigHost - The file system host
 * 3. basePath: string - Base path for resolving files
 * 4. existingOptions?: CompilerOptions - Existing compiler options (4th parameter)
 * 5. configFileName?: string - Path to tsconfig.json
 *
 * KEY DISCOVERY:
 * ============
 * When both json.compilerOptions AND existingOptions are provided,
 * **existingOptions takes PRECEDENCE** over json.compilerOptions!
 *
 * This is counter-intuitive and not clearly documented. The merge behavior is:
 * Result = { ...parsedJsonOptions, ...existingOptions }
 *
 * In other words: existingOptions overwrites json.compilerOptions.
 *
 * DETAILED FINDINGS:
 * =================
 *
 * 1. When ONLY json.compilerOptions is provided:
 *    - All options from json.compilerOptions are used
 *    - This is the expected and straightforward behavior
 *
 * 2. When ONLY existingOptions is provided:
 *    - All options from existingOptions are used
 *    - json.compilerOptions (if empty) is ignored
 *
 * 3. When BOTH json.compilerOptions AND existingOptions are provided:
 *    - For options that exist in existingOptions: existingOptions wins
 *    - For options that DON'T exist in existingOptions: json.compilerOptions wins
 *    - Example:
 *      json: { target: 'ES2020', allowJs: true }
 *      existing: { target: ES5, module: CommonJS }
 *      result: { target: ES5, module: CommonJS, allowJs: true }
 *                  ^^^^^ existing wins   ^^^^^ from json (not in existing)
 *
 * 4. undefined/null values in json.compilerOptions:
 *    - If json has undefined/null: existingOptions value is kept
 *    - This is consistent with the precedence rule
 *
 * 5. Explicit false values in json.compilerOptions:
 *    - Even explicit false in json is ignored if existingOptions has true
 *    - Example:
 *      json: { noEmit: false }
 *      existing: { noEmit: true }
 *      result: { noEmit: true }  // existing wins, json false is ignored
 *
 * 6. configFilePath parameter (5th parameter):
 *    - Does NOT affect the options merging behavior
 *    - Only affects @types resolution (see comprehensive-host-tracking.test.ts)
 *    - Is stored in parsed.options.configFilePath
 *
 * PRACTICAL IMPLICATIONS:
 * ======================
 *
 * 1. If you want to override options: DON'T pass existingOptions
 *    - Parse the tsconfig.json first to get base options
 *    - Then manually merge with your overrides
 *
 * 2. If you want to provide defaults: Use existingOptions
 *    - tsconfig.json will only add options that aren't in existingOptions
 *    - This is useful for providing fallback values
 *
 * 3. Order matters for the merge:
 *    - Think of it as: Object.assign({}, jsonOptions, existingOptions)
 *    - existingOptions is applied LAST, so it wins
 *
 * 4. Common mistake to avoid:
 *    ❌ Passing existingOptions expecting json to override it
 *    ✅ Pass empty existingOptions if you want json to be authoritative
 *
 * EXAMPLE USE CASES:
 * ==================
 *
 * Use case 1: Parse tsconfig.json with no overrides
 * ```typescript
 * const parsed = ts.parseJsonConfigFileContent(
 *   tsconfig,
 *   ts.sys,
 *   basePath,
 *   undefined, // no existingOptions
 * );
 * // All options come from tsconfig
 * ```
 *
 * Use case 2: Provide default options that tsconfig can't override
 * ```typescript
 * const parsed = ts.parseJsonConfigFileContent(
 *   tsconfig,
 *   ts.sys,
 *   basePath,
 *   { noEmit: true, target: ES2020 }, // These WIN over tsconfig
 * );
 * // tsconfig can only add NEW options, not override these
 * ```
 *
 * Use case 3: Parse tsconfig, then manually apply overrides
 * ```typescript
 * const parsed = ts.parseJsonConfigFileContent(
 *   tsconfig,
 *   ts.sys,
 *   basePath,
 * );
 * // Manually merge with higher precedence
 * const finalOptions = { ...parsed.options, noEmit: true };
 * ```
 *
 * CONCLUSION:
 * ===========
 * The existingOptions parameter is NOT for "existing options to be overridden",
 * but rather for "options that should take precedence over the config file".
 *
 * This naming is confusing and the behavior is counter-intuitive, but it's
 * the actual behavior of TypeScript's ts.parseJsonConfigFileContent.
 */

import { describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';

describe('ts.parseJsonConfigFileContent options precedence', () => {
  const basePath = '/project';

  it('should use options from json.compilerOptions when existingOptions is not provided', () => {
    const parsed = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'CommonJS',
          strict: true,
        },
      },
      ts.sys,
      basePath,
    );

    console.log('\n=== Options from json.compilerOptions only ===');
    console.log('target:', ts.ScriptTarget[parsed.options.target!]);
    console.log('module:', ts.ModuleKind[parsed.options.module!]);
    console.log('strict:', parsed.options.strict);

    expect(parsed.options.target).toBe(ts.ScriptTarget.ES2020);
    expect(parsed.options.module).toBe(ts.ModuleKind.CommonJS);
    expect(parsed.options.strict).toBe(true);
  });

  it('should use options from existingOptions when json.compilerOptions is not provided', () => {
    const parsed = ts.parseJsonConfigFileContent({}, ts.sys, basePath, {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.ESNext,
      strict: false,
    });

    console.log('\n=== Options from existingOptions only ===');
    console.log('target:', ts.ScriptTarget[parsed.options.target!]);
    console.log('module:', ts.ModuleKind[parsed.options.module!]);
    console.log('strict:', parsed.options.strict);

    expect(parsed.options.target).toBe(ts.ScriptTarget.ES2019);
    expect(parsed.options.module).toBe(ts.ModuleKind.ESNext);
    expect(parsed.options.strict).toBe(false);
  });

  it('should prefer existingOptions over json.compilerOptions when both are provided', () => {
    const parsed = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'CommonJS',
          strict: true,
        },
      },
      ts.sys,
      basePath,
      {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.AMD,
        strict: false,
        noEmit: true, // This is not in json, should be kept
      },
    );

    console.log('\n=== Precedence: existingOptions OVERRIDES json.compilerOptions ===');
    console.log('target (json: ES2020, existing: ES5):', ts.ScriptTarget[parsed.options.target!]);
    console.log('module (json: CommonJS, existing: AMD):', ts.ModuleKind[parsed.options.module!]);
    console.log('strict (json: true, existing: false):', parsed.options.strict);
    console.log('noEmit (only in existing):', parsed.options.noEmit);

    // existingOptions wins over json.compilerOptions!
    expect(parsed.options.target).toBe(ts.ScriptTarget.ES5);
    expect(parsed.options.module).toBe(ts.ModuleKind.AMD);
    expect(parsed.options.strict).toBe(false);

    // Options only in existingOptions are kept
    expect(parsed.options.noEmit).toBe(true);
  });

  it('should merge options: existingOptions overrides, json adds new options', () => {
    const parsed = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
          allowJs: true,
        },
      },
      ts.sys,
      basePath,
      {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.ESNext,
        strict: true,
        noEmit: true,
      },
    );

    console.log('\n=== Merge behavior ===');
    console.log('target (existing overrides json):', ts.ScriptTarget[parsed.options.target!]);
    console.log('allowJs (from json, not in existing):', parsed.options.allowJs);
    console.log('module (from existing, not in json):', ts.ModuleKind[parsed.options.module!]);
    console.log('strict (from existing, not in json):', parsed.options.strict);
    console.log('noEmit (from existing, not in json):', parsed.options.noEmit);

    expect(parsed.options.target).toBe(ts.ScriptTarget.ES5); // existing wins
    expect(parsed.options.allowJs).toBe(true); // from json (not in existing)
    expect(parsed.options.module).toBe(ts.ModuleKind.ESNext); // from existing
    expect(parsed.options.strict).toBe(true); // from existing
    expect(parsed.options.noEmit).toBe(true); // from existing
  });

  it('should handle all common compiler options with precedence', () => {
    const parsed = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM'],
          jsx: 'react',
          moduleResolution: 'node',
        },
      },
      ts.sys,
      basePath,
      {
        target: ts.ScriptTarget.ES5,
        lib: ['es5', 'es2015'],
        module: ts.ModuleKind.CommonJS,
        strict: true,
        esModuleInterop: true,
      },
    );

    console.log('\n=== All common options ===');
    console.log('target (json: ES2020, existing: ES5):', ts.ScriptTarget[parsed.options.target!]);
    console.log('lib (json: [ES2020, DOM], existing: [es5, es2015]):', parsed.options.lib);
    console.log('jsx (json: react, existing: undefined):', ts.JsxEmit[parsed.options.jsx!]);
    console.log(
      'moduleResolution (json: node, existing: undefined):',
      ts.ModuleResolutionKind[parsed.options.moduleResolution!],
    );
    console.log(
      'module (json: undefined, existing: CommonJS):',
      ts.ModuleKind[parsed.options.module!],
    );
    console.log('strict (json: undefined, existing: true):', parsed.options.strict);
    console.log(
      'esModuleInterop (json: undefined, existing: true):',
      parsed.options.esModuleInterop,
    );

    // existing wins for options defined in both
    expect(parsed.options.target).toBe(ts.ScriptTarget.ES5);
    expect(parsed.options.lib).toContain('es5');
    expect(parsed.options.lib).toContain('es2015');

    // json wins for options NOT in existing
    expect(parsed.options.jsx).toBe(ts.JsxEmit.React);
    expect(parsed.options.moduleResolution).toBe(ts.ModuleResolutionKind.Node10);

    // existing wins for options json doesn't define
    expect(parsed.options.module).toBe(ts.ModuleKind.CommonJS);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.esModuleInterop).toBe(true);
  });

  it('should show that existing options are NOT overridden even when json has values', () => {
    const parsed = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
          strict: undefined, // explicitly undefined
          module: null, // explicitly null
        },
      },
      ts.sys,
      basePath,
      {
        target: ts.ScriptTarget.ES5,
        strict: true,
        module: ts.ModuleKind.CommonJS,
      },
    );

    console.log('\n=== undefined/null values in json ===');
    console.log('target (json: ES2020, existing: ES5):', ts.ScriptTarget[parsed.options.target!]);
    console.log('strict (json: undefined, existing: true):', parsed.options.strict);
    console.log(
      'module (json: null, existing: CommonJS):',
      parsed.options.module ? ts.ModuleKind[parsed.options.module] : 'undefined',
    );

    // existing always wins, even when json has a defined value
    expect(parsed.options.target).toBe(ts.ScriptTarget.ES5);
    // undefined/null in json doesn't override existing
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.module).toBe(ts.ModuleKind.CommonJS);
  });

  it('should compare raw option objects to see exact merge behavior', () => {
    const existingOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    };

    const parsed = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
          allowJs: true,
          noEmit: false, // tries to override existing, but existing wins
        },
      },
      ts.sys,
      basePath,
      existingOptions,
    );

    console.log('\n=== Raw options comparison ===');
    console.log('Existing options:', existingOptions);
    console.log('\nParsed options (relevant subset):');
    console.log('  target:', ts.ScriptTarget[parsed.options.target!], '(existing wins)');
    console.log('  module:', ts.ModuleKind[parsed.options.module!], '(from existing)');
    console.log('  strict:', parsed.options.strict, '(from existing)');
    console.log('  noEmit:', parsed.options.noEmit, '(existing wins, json false ignored)');
    console.log('  skipLibCheck:', parsed.options.skipLibCheck, '(from existing)');
    console.log('  allowJs:', parsed.options.allowJs, '(from json, not in existing)');

    expect(parsed.options.target).toBe(ts.ScriptTarget.ES5); // existing wins
    expect(parsed.options.module).toBe(ts.ModuleKind.CommonJS); // kept from existing
    expect(parsed.options.strict).toBe(true); // kept from existing
    expect(parsed.options.noEmit).toBe(true); // existing wins, json false is ignored
    expect(parsed.options.skipLibCheck).toBe(true); // kept from existing
    expect(parsed.options.allowJs).toBe(true); // from json (not in existing)
  });

  it('should show full merged options object structure', () => {
    const existingOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.ESNext,
      strict: true,
    };

    const parsed = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
          allowJs: true,
        },
      },
      ts.sys,
      basePath,
      existingOptions,
      undefined, // configFileName
    );

    console.log('\n=== Full merged options ===');
    console.log('Input - existingOptions:', JSON.stringify(existingOptions, null, 2));
    console.log(
      '\nInput - json.compilerOptions:',
      JSON.stringify({ target: 'ES2020', allowJs: true }, null, 2),
    );

    // Extract only the relevant options from parsed.options
    const relevantOptions = {
      target: parsed.options.target,
      targetText: ts.ScriptTarget[parsed.options.target!],
      module: parsed.options.module,
      moduleText: parsed.options.module ? ts.ModuleKind[parsed.options.module] : undefined,
      strict: parsed.options.strict,
      allowJs: parsed.options.allowJs,
      configFilePath: parsed.options.configFilePath,
    };
    console.log('\nOutput - parsed.options (subset):', JSON.stringify(relevantOptions, null, 2));

    // Document the merge algorithm
    console.log('\n=== Merge Algorithm Summary (ACTUAL BEHAVIOR) ===');
    console.log('1. Start with existingOptions as base');
    console.log('2. Parse json.compilerOptions');
    console.log('3. For each option:');
    console.log('   - If exists in existingOptions: KEEP existingOptions (existing wins!)');
    console.log('   - If NOT in existingOptions: ADD from json.compilerOptions');
    console.log('4. Result: { ...parsedJsonOptions, ...existingOptions }');
    console.log('5. In other words: existingOptions takes precedence over json!');
  });

  it('should test with configFilePath parameter', () => {
    const parsed1 = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
        },
      },
      ts.sys,
      basePath,
      {
        module: ts.ModuleKind.CommonJS,
      },
      undefined, // no configFilePath
    );

    const parsed2 = ts.parseJsonConfigFileContent(
      {
        compilerOptions: {
          target: 'ES2020',
        },
      },
      ts.sys,
      basePath,
      {
        module: ts.ModuleKind.CommonJS,
      },
      '/project/tsconfig.json', // with configFilePath
    );

    console.log('\n=== Impact of configFilePath on options merging ===');
    console.log('Without configFilePath:');
    console.log('  target:', ts.ScriptTarget[parsed1.options.target!]);
    console.log('  module:', ts.ModuleKind[parsed1.options.module!]);
    console.log('  configFilePath:', parsed1.options.configFilePath);

    console.log('\nWith configFilePath:');
    console.log('  target:', ts.ScriptTarget[parsed2.options.target!]);
    console.log('  module:', ts.ModuleKind[parsed2.options.module!]);
    console.log('  configFilePath:', parsed2.options.configFilePath);

    console.log('\nConclusion: configFilePath does NOT affect options merging behavior');
    console.log(
      'It only affects @types resolution (as discovered in comprehensive-host-tracking.test.ts)',
    );

    // Both should have same options (except configFilePath itself)
    expect(parsed1.options.target).toBe(parsed2.options.target);
    expect(parsed1.options.module).toBe(parsed2.options.module);
    expect(parsed1.options.configFilePath).toBeUndefined();
    expect(parsed2.options.configFilePath).toBe('/project/tsconfig.json');
  });
});
