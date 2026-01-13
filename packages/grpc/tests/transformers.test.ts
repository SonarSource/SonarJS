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
