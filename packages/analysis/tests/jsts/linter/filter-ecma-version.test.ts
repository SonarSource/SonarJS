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
import type { RuleConfig } from '../../../src/jsts/linter/config/rule-config.js';
import { filterEcmaVersion } from '../../../src/jsts/linter/filters/filter-ecma-version.js';
import type { RuleFilterContext } from '../../../src/jsts/linter/filters/index.js';
import type { SonarMeta } from '../../../src/jsts/rules/helpers/generate-meta.js';

const ruleConfig = {
  key: 'S6582',
  configurations: [],
  fileTypeTargets: ['MAIN'],
  language: 'ts',
  analysisModes: ['DEFAULT'],
} satisfies RuleConfig;

const baseContext: RuleFilterContext = {
  extensionName: '.ts',
  fileType: 'MAIN',
  fileLanguage: 'ts',
  analysisMode: 'DEFAULT',
  detectedEsYear: 2019,
  detectedModuleType: undefined,
  detectGeneratedCode: true,
  isGeneratedSource: false,
  dependencies: new Map(),
};

const syntaxMeta = {
  meta: { type: 'suggestion', docs: {} },
  sonarKey: 'S6582',
  eslintId: 'prefer-optional-chain',
  scope: 'Main',
  languages: ['js', 'ts'],
  implementation: 'decorated',
  requiredDependency: [],
  requiredEcmaVersion: 2020,
  downlevelableSyntax: true,
} satisfies SonarMeta;

const apiMeta = {
  meta: { type: 'suggestion', docs: {} },
  sonarKey: 'S6653',
  eslintId: 'prefer-object-has-own',
  scope: 'Main',
  languages: ['js', 'ts'],
  implementation: 'original',
  requiredDependency: [],
  requiredEcmaVersion: 2022,
} satisfies SonarMeta;

describe('filterEcmaVersion', () => {
  it('should suppress a rule when the detected ES year is below its requirement', () => {
    expect(filterEcmaVersion(ruleConfig, apiMeta, { ...baseContext, fileLanguage: 'js' })).toBe(
      false,
    );
  });

  it('should keep a rule when the detected ES year meets its requirement', () => {
    expect(
      filterEcmaVersion(ruleConfig, syntaxMeta, { ...baseContext, detectedEsYear: 2020 }),
    ).toBe(true);
  });

  it('should keep downlevelable-syntax rules on TypeScript regardless of the detected ES year', () => {
    expect(filterEcmaVersion(ruleConfig, syntaxMeta, baseContext)).toBe(true);
  });

  it('should still suppress downlevelable-syntax rules on JavaScript below their requirement', () => {
    expect(filterEcmaVersion(ruleConfig, syntaxMeta, { ...baseContext, fileLanguage: 'js' })).toBe(
      false,
    );
  });

  it('should still gate runtime-API rules on TypeScript (TS does not polyfill)', () => {
    expect(filterEcmaVersion(ruleConfig, apiMeta, baseContext)).toBe(false);
  });

  it('should keep rules with no ES-year requirement', () => {
    const meta = { ...syntaxMeta, requiredEcmaVersion: undefined } satisfies SonarMeta;
    expect(filterEcmaVersion(ruleConfig, meta, { ...baseContext, fileLanguage: 'js' })).toBe(true);
  });

  it('should keep rules when no ES year was detected', () => {
    expect(
      filterEcmaVersion(ruleConfig, apiMeta, { ...baseContext, detectedEsYear: undefined }),
    ).toBe(true);
  });
});
