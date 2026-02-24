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
import { transformRequestToProjectInput } from '../src/transformers/index.js';
import { transformProjectOutputToResponse } from '../src/transformers/response.js';
import { buildRuleConfigurations as buildCssRuleConfigurations } from '../src/transformers/rule-configurations/css.js';
import { buildRuleConfigurations as buildJstsRuleConfigurations } from '../src/transformers/rule-configurations/jsts.js';
import type { analyzer } from '../src/proto/language_analyzer.js';

describe('transformRequestToProjectInput', () => {
  describe('rule options transformation', () => {
    it('should map SQ param key to ESLint field name when displayName differs', () => {
      // S107 has displayName: 'maximumFunctionParameters' but field: 'max'
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: 'function f() {}' }],
        activeRules: [
          {
            ruleKey: { repo: 'javascript', rule: 'S107' },
            params: [{ key: 'maximumFunctionParameters', value: '5' }],
          },
        ],
      };

      const result = transformRequestToProjectInput(request);

      // Find the S107 rule config
      const s107Rules = result.rules.filter(r => r.key === 'S107');
      expect(s107Rules.length).toBeGreaterThan(0);

      // The configuration should use 'max' (ESLint field name), not 'maximumFunctionParameters'
      const config = s107Rules[0].configurations[0] as Record<string, unknown>;
      expect(config).toHaveProperty('max');
      expect(config.max).toBe(5); // Should be parsed as number
      expect(config).not.toHaveProperty('maximumFunctionParameters');
    });

    it('should parse numeric params correctly', () => {
      // S1192 has threshold (integer) and ignoreStrings (string)
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [
          {
            ruleKey: { repo: 'javascript', rule: 'S1192' },
            params: [
              { key: 'threshold', value: '5' },
              { key: 'ignoreStrings', value: 'foo,bar' },
            ],
          },
        ],
      };

      const result = transformRequestToProjectInput(request);

      const s1192Rules = result.rules.filter(r => r.key === 'S1192');
      expect(s1192Rules.length).toBeGreaterThan(0);

      const config = s1192Rules[0].configurations[0] as Record<string, unknown>;
      expect(config.threshold).toBe(5); // number, not string
      expect(config.ignoreStrings).toBe('foo,bar'); // string
    });

    it('should use field name as SQ key when no displayName', () => {
      // S100 has field: 'format' with no displayName
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [
          {
            ruleKey: { repo: 'javascript', rule: 'S100' },
            params: [{ key: 'format', value: '^[A-Z][a-zA-Z0-9]*$' }],
          },
        ],
      };

      const result = transformRequestToProjectInput(request);

      const s100Rules = result.rules.filter(r => r.key === 'S100');
      expect(s100Rules.length).toBeGreaterThan(0);

      const config = s100Rules[0].configurations[0] as Record<string, unknown>;
      expect(config.format).toBe('^[A-Z][a-zA-Z0-9]*$');
    });

    it('should create rule configs for correct languages only', () => {
      // S1444 is TypeScript-only (languages: ['ts'])
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.ts', content: '' }],
        activeRules: [{ ruleKey: { repo: 'javascript', rule: 'S1444' }, params: [] }],
      };

      const result = transformRequestToProjectInput(request);

      const s1444Rules = result.rules.filter(r => r.key === 'S1444');
      expect(s1444Rules.length).toBe(1);
      expect(s1444Rules[0].language).toBe('ts');
    });

    it('should create rule configs for both JS and TS when supported', () => {
      // S107 supports both JS and TS
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [{ ruleKey: { repo: 'javascript', rule: 'S107' }, params: [] }],
      };

      const result = transformRequestToProjectInput(request);

      const s107Rules = result.rules.filter(r => r.key === 'S107');
      expect(s107Rules.length).toBe(2);
      expect(s107Rules.map(r => r.language).sort()).toEqual(['js', 'ts']);
    });

    it('should set fileTypeTargets based on rule scope', () => {
      // S2699 is a test rule (scope: 'Tests')
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.spec.js', content: '' }],
        activeRules: [{ ruleKey: { repo: 'javascript', rule: 'S2699' }, params: [] }],
      };

      const result = transformRequestToProjectInput(request);

      const s2699Rules = result.rules.filter(r => r.key === 'S2699');
      expect(s2699Rules.length).toBeGreaterThan(0);
      expect(s2699Rules[0].fileTypeTargets).toEqual(['TEST']);
    });

    it('should set fileTypeTargets to MAIN and TEST for main scope rules', () => {
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [{ ruleKey: { repo: 'javascript', rule: 'S107' }, params: [] }],
      };

      const result = transformRequestToProjectInput(request);

      const s107Rules = result.rules.filter(r => r.key === 'S107');
      expect(s107Rules[0].fileTypeTargets).toEqual(['MAIN']);
    });

    it('should skip unknown rules', () => {
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [
          { ruleKey: { repo: 'javascript', rule: 'UNKNOWN_RULE' }, params: [] },
          { ruleKey: { repo: 'javascript', rule: 'S107' }, params: [] },
        ],
      };

      const result = transformRequestToProjectInput(request);

      // UNKNOWN_RULE should be skipped, S107 should be present
      expect(result.rules.some(r => r.key === 'UNKNOWN_RULE')).toBe(false);
      expect(result.rules.some(r => r.key === 'S107')).toBe(true);
    });

    it('should ignore params with unknown keys', () => {
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [
          {
            ruleKey: { repo: 'javascript', rule: 'S107' },
            params: [
              { key: 'maximumFunctionParameters', value: '5' },
              { key: 'unknownParam', value: 'ignored' },
            ],
          },
        ],
      };

      const result = transformRequestToProjectInput(request);

      const s107Rules = result.rules.filter(r => r.key === 'S107');
      const config = s107Rules[0].configurations[0] as Record<string, unknown>;

      expect(config).toHaveProperty('max', 5);
      expect(config).not.toHaveProperty('unknownParam');
    });

    it('should handle rules without params', () => {
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [{ ruleKey: { repo: 'javascript', rule: 'S107' }, params: [] }],
      };

      const result = transformRequestToProjectInput(request);

      const s107Rules = result.rules.filter(r => r.key === 'S107');
      expect(s107Rules.length).toBeGreaterThan(0);
      // configurations should be empty when no params provided
      expect(s107Rules[0].configurations).toEqual([]);
    });

    it('should parse string array params from comma-separated string', () => {
      // S2068 has passwordWords with default: ['password', 'pwd', 'passwd', 'passphrase']
      // Java sends it as comma-separated string
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [
          {
            ruleKey: { repo: 'javascript', rule: 'S2068' },
            params: [{ key: 'passwordWords', value: 'secret,apikey,token' }],
          },
        ],
      };

      const result = transformRequestToProjectInput(request);

      const s2068Rules = result.rules.filter(r => r.key === 'S2068');
      expect(s2068Rules.length).toBeGreaterThan(0);

      const config = s2068Rules[0].configurations[0] as Record<string, unknown>;
      expect(config.passwordWords).toEqual(['secret', 'apikey', 'token']);
    });

    it('should parse number array params from comma-separated string', () => {
      // S109 has ignore with default: [0, 1, -1, 24, 60] (number array)
      // Java sends it as comma-separated string
      const request: analyzer.IAnalyzeRequest = {
        sourceFiles: [{ relativePath: 'test.js', content: '' }],
        activeRules: [
          {
            ruleKey: { repo: 'javascript', rule: 'S109' },
            params: [{ key: 'ignore', value: '0,1,2,42' }],
          },
        ],
      };

      const result = transformRequestToProjectInput(request);

      const s109Rules = result.rules.filter(r => r.key === 'S109');
      expect(s109Rules.length).toBeGreaterThan(0);

      const config = s109Rules[0].configurations[0] as Record<string, unknown>;
      expect(config.ignore).toEqual([0, 1, 2, 42]);
    });
  });
});

describe('CSS rule configurations', () => {
  it('should return null for unknown CSS rule', () => {
    expect(buildCssRuleConfigurations('UNKNOWN_RULE', [])).toBeNull();
  });

  it('should return empty configurations for a rule with no params', () => {
    // S4658 (block-no-empty) has no listParam or booleanParam
    const result = buildCssRuleConfigurations('S4658', []);
    expect(result).toEqual({ key: 'block-no-empty', configurations: [] });
  });

  describe('listParam', () => {
    it('should use default values when no params are sent', () => {
      // S4659: ignorePseudoClasses default is 'local,global,export,import,deep'
      const result = buildCssRuleConfigurations('S4659', []);
      expect(result!.configurations).toEqual([
        true,
        { ignorePseudoClasses: ['local', 'global', 'export', 'import', 'deep'] },
      ]);
    });

    it('should use explicit param value overriding the default', () => {
      const result = buildCssRuleConfigurations('S4659', [
        { key: 'ignorePseudoClasses', value: 'local,custom' },
      ]);
      expect(result!.configurations).toEqual([true, { ignorePseudoClasses: ['local', 'custom'] }]);
    });

    it('should trim whitespace from comma-separated values', () => {
      const result = buildCssRuleConfigurations('S4659', [
        { key: 'ignorePseudoClasses', value: ' local , custom ' },
      ]);
      expect(result!.configurations).toEqual([true, { ignorePseudoClasses: ['local', 'custom'] }]);
    });

    it('should return empty configurations when param value is empty string', () => {
      // Explicit '' overrides the default and produces no secondary options
      const result = buildCssRuleConfigurations('S4659', [
        { key: 'ignorePseudoClasses', value: '' },
      ]);
      expect(result!.configurations).toEqual([]);
    });

    it('should treat null param value as empty string, not the default', () => {
      // null → stored as '' via isString guard → not in secondary options → []
      const result = buildCssRuleConfigurations('S4659', [
        { key: 'ignorePseudoClasses', value: null },
      ]);
      expect(result!.configurations).toEqual([]);
    });

    it('should skip params with a falsy key, falling back to defaults', () => {
      const result = buildCssRuleConfigurations('S4659', [{ key: null, value: 'local' }]);
      expect(result!.configurations).toEqual([
        true,
        { ignorePseudoClasses: ['local', 'global', 'export', 'import', 'deep'] },
      ]);
    });

    it('should merge multiple listParams using defaults when no params sent', () => {
      // S4654 (property-no-unknown) has two listParams: ignoreTypes and ignoreSelectors
      const result = buildCssRuleConfigurations('S4654', []);
      expect(result!.configurations).toEqual([
        true,
        {
          ignoreProperties: ['composes', '/^mso-/'],
          ignoreSelectors: ['/^:export.*/', '/^:import.*/'],
        },
      ]);
    });

    it('should partially override multiple listParams, keeping defaults for unset ones', () => {
      const result = buildCssRuleConfigurations('S4654', [{ key: 'ignoreTypes', value: 'myProp' }]);
      expect(result!.configurations).toEqual([
        true,
        {
          ignoreProperties: ['myProp'],
          ignoreSelectors: ['/^:export.*/', '/^:import.*/'],
        },
      ]);
    });

    it('should return empty configurations when all listParam values are empty', () => {
      const result = buildCssRuleConfigurations('S4654', [
        { key: 'ignoreTypes', value: '' },
        { key: 'ignoreSelectors', value: '' },
      ]);
      expect(result!.configurations).toEqual([]);
    });
  });

  describe('booleanParam', () => {
    // S4656 (declaration-block-no-duplicate-properties): ignoreFallbacks, default true
    const onTrue = [true, { ignore: ['consecutive-duplicates-with-different-values'] }];

    it('should use the default (true) when no params are sent', () => {
      const result = buildCssRuleConfigurations('S4656', []);
      expect(result!.configurations).toEqual(onTrue);
    });

    it('should enable with explicit true value', () => {
      const result = buildCssRuleConfigurations('S4656', [
        { key: 'ignoreFallbacks', value: 'true' },
      ]);
      expect(result!.configurations).toEqual(onTrue);
    });

    it('should disable with explicit false value', () => {
      const result = buildCssRuleConfigurations('S4656', [
        { key: 'ignoreFallbacks', value: 'false' },
      ]);
      expect(result!.configurations).toEqual([]);
    });

    it('should fall back to the default for unrecognized values', () => {
      const result = buildCssRuleConfigurations('S4656', [
        { key: 'ignoreFallbacks', value: 'yes' },
      ]);
      expect(result!.configurations).toEqual(onTrue);
    });

    it('should fall back to the default for null value', () => {
      // null → '' via isString guard → neither 'true' nor 'false' → uses default
      const result = buildCssRuleConfigurations('S4656', [{ key: 'ignoreFallbacks', value: null }]);
      expect(result!.configurations).toEqual(onTrue);
    });
  });
});

describe('JS/TS rule configurations', () => {
  it('should return null for unknown rule', () => {
    expect(buildJstsRuleConfigurations('UNKNOWN_RULE', [])).toBeNull();
  });

  describe('Type C: single primitive with displayName (S3776 — cognitive complexity)', () => {
    // S3776: fields = [{ default: 15, displayName: 'threshold' }]

    it('should parse a numeric primitive param', () => {
      const result = buildJstsRuleConfigurations('S3776', [{ key: 'threshold', value: '20' }])!;
      expect(result[0].configurations).toEqual([20]);
    });

    it('should return empty configurations when the param is not sent', () => {
      const result = buildJstsRuleConfigurations('S3776', [])!;
      expect(result[0].configurations).toEqual([]);
    });

    it('should fall back to the field default when the value is not a valid number', () => {
      const result = buildJstsRuleConfigurations('S3776', [
        { key: 'threshold', value: 'notanumber' },
      ])!;
      expect(result[0].configurations).toEqual([15]);
    });
  });

  describe('Type B: single primitive without displayName (S1440 — eqeqeq)', () => {
    // S1440: fields = [{ default: 'smart' }] — no SQ key, uses first param value

    it('should use the first param value regardless of key', () => {
      const result = buildJstsRuleConfigurations('S1440', [{ key: 'anything', value: 'always' }])!;
      expect(result[0].configurations).toEqual(['always']);
    });

    it('should return empty configurations when no params are sent', () => {
      const result = buildJstsRuleConfigurations('S1440', [])!;
      expect(result[0].configurations).toEqual([]);
    });
  });

  describe('Type D: mixed primitive + object (S1105 — brace-style)', () => {
    // S1105: fields = [{ default: '1tbs', displayName: 'braceStyle' }, [{ field: 'allowSingleLine', default: true }]]

    it('should build both primitive and object configs when both are sent', () => {
      const result = buildJstsRuleConfigurations('S1105', [
        { key: 'braceStyle', value: 'allman' },
        { key: 'allowSingleLine', value: 'false' },
      ])!;
      expect(result[0].configurations).toEqual(['allman', { allowSingleLine: false }]);
    });

    it('should build only the primitive config when only the primitive param is sent', () => {
      const result = buildJstsRuleConfigurations('S1105', [
        { key: 'braceStyle', value: 'allman' },
      ])!;
      expect(result[0].configurations).toEqual(['allman']);
    });

    it('should build only the object config when only the object param is sent', () => {
      const result = buildJstsRuleConfigurations('S1105', [
        { key: 'allowSingleLine', value: 'false' },
      ])!;
      expect(result[0].configurations).toEqual([{ allowSingleLine: false }]);
    });

    it('should return empty configurations when no params are sent', () => {
      const result = buildJstsRuleConfigurations('S1105', [])!;
      expect(result[0].configurations).toEqual([]);
    });
  });

  describe('parseParamValue type coercion', () => {
    it('should parse boolean string true', () => {
      // S1105's allowSingleLine field has default: true
      const result = buildJstsRuleConfigurations('S1105', [
        { key: 'allowSingleLine', value: 'true' },
      ])!;
      expect((result[0].configurations[0] as Record<string, unknown>).allowSingleLine).toBe(true);
    });

    it('should parse boolean string false', () => {
      const result = buildJstsRuleConfigurations('S1105', [
        { key: 'allowSingleLine', value: 'false' },
      ])!;
      expect((result[0].configurations[0] as Record<string, unknown>).allowSingleLine).toBe(false);
    });

    it('should filter NaN values from a number array param', () => {
      // S109: ignore field has default [0, 1, -1, 24, 60]
      const result = buildJstsRuleConfigurations('S109', [{ key: 'ignore', value: '1,bad,3' }])!;
      const config = result[0].configurations[0] as Record<string, unknown>;
      expect(config.ignore).toEqual([1, 3]);
    });

    it('should store a null param value as empty string', () => {
      // null value → isString guard → '' → parseParamValue('', string default) → ''
      const result = buildJstsRuleConfigurations('S100', [{ key: 'format', value: null }])!;
      const config = result[0].configurations[0] as Record<string, unknown>;
      expect(config.format).toBe('');
    });

    it('should skip params with a falsy key', () => {
      // null key → if (param.key) guard → not added to paramsLookup
      const result = buildJstsRuleConfigurations('S3776', [{ key: null, value: '20' }])!;
      expect(result[0].configurations).toEqual([]);
    });
  });
});

describe('transformProjectOutputToResponse', () => {
  function makeOutput(files: Record<string, unknown>) {
    return { files, meta: { warnings: [] } } as unknown as Parameters<
      typeof transformProjectOutputToResponse
    >[0];
  }

  it('should include ncloc measure for a MAIN file with code lines', () => {
    const output = makeOutput({
      '/project/src/main.js': { issues: [], metrics: { nosonarLines: [], ncloc: [1, 2, 5] } },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.measures).toEqual([
      { filePath: '/project/src/main.js', measures: [{ metricKey: 'ncloc', intValue: 3 }] },
    ]);
  });

  it('should include ncloc measure for a TEST file with code lines', () => {
    const output = makeOutput({
      '/project/tests/foo.test.js': {
        issues: [],
        metrics: { nosonarLines: [], ncloc: [1, 3] },
      },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.measures).toEqual([
      {
        filePath: '/project/tests/foo.test.js',
        measures: [{ metricKey: 'ncloc', intValue: 2 }],
      },
    ]);
  });

  it('should emit a measure with intValue 0 for an empty file', () => {
    const output = makeOutput({
      '/project/src/empty.js': { issues: [], metrics: { nosonarLines: [], ncloc: [] } },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.measures).toEqual([
      { filePath: '/project/src/empty.js', measures: [{ metricKey: 'ncloc', intValue: 0 }] },
    ]);
  });

  it('should not include a measures entry for a file with a parsing error', () => {
    const output = makeOutput({
      '/project/src/broken.js': {
        parsingError: { message: 'Unexpected token', code: 'PARSING', line: 5 },
      },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.measures).toEqual([]);
  });

  it('should not include a measures entry for a file with an analysis error', () => {
    const output = makeOutput({
      '/project/src/failed.js': { error: 'TypeScript compilation failed' },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.measures).toEqual([]);
  });

  it('should not include a measures entry when metrics has no ncloc', () => {
    const output = makeOutput({
      '/project/src/no-ncloc.js': { issues: [], metrics: { nosonarLines: [] } },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.measures).toEqual([]);
  });

  it('should propagate CSS issue endLine and endColumn to textRange', () => {
    const output = makeOutput({
      '/project/src/styles.css': {
        issues: [
          {
            ruleId: 'block-no-empty',
            language: 'css',
            line: 1,
            column: 3,
            endLine: 1,
            endColumn: 6,
            message: 'Unexpected empty block',
          },
        ],
      },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.issues?.length).toBe(1);
    expect(result.issues?.[0].textRange).toEqual({
      startLine: 1,
      startLineOffset: 3,
      endLine: 1,
      endLineOffset: 6,
    });
  });

  it('should fall back to start position when CSS issue has no endLine/endColumn', () => {
    const output = makeOutput({
      '/project/src/styles.css': {
        issues: [
          {
            ruleId: 'block-no-empty',
            language: 'css',
            line: 1,
            column: 3,
            message: 'Unexpected empty block',
          },
        ],
      },
    });

    const result = transformProjectOutputToResponse(output);

    expect(result.issues?.length).toBe(1);
    expect(result.issues?.[0].textRange).toEqual({
      startLine: 1,
      startLineOffset: 3,
      endLine: 1,
      endLineOffset: 3,
    });
  });
});
