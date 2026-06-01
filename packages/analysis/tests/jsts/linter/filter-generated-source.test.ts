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
import { filterGeneratedSource } from '../../../src/jsts/linter/filters/filter-generated-source.js';
import type { RuleFilterContext } from '../../../src/jsts/linter/filters/index.js';
import type { SonarMeta } from '../../../src/jsts/rules/helpers/generate-meta.js';

const ruleConfig = {
  key: 'S3776',
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
  detectedEsYear: undefined,
  detectedModuleType: undefined,
  detectGeneratedCode: true,
  isGeneratedSource: false,
  dependencies: new Map(),
};

const generatedSourceMeta = {
  meta: { type: 'problem', docs: {} },
  sonarKey: 'S3776',
  eslintId: 'cognitive-complexity',
  scope: 'All',
  languages: ['ts'],
  skipOnGeneratedSource: true,
  implementation: 'original',
  requiredDependency: [],
} satisfies SonarMeta;

describe('filterGeneratedSource', () => {
  it('should keep rules for non-generated files', () => {
    expect(filterGeneratedSource(ruleConfig, generatedSourceMeta, baseContext)).toBe(true);
  });

  it('should keep rules that do not opt out on generated files', () => {
    expect(
      filterGeneratedSource(ruleConfig, undefined, {
        ...baseContext,
        isGeneratedSource: true,
      }),
    ).toBe(true);
  });

  it('should disable rules that opt out on generated files', () => {
    expect(
      filterGeneratedSource(ruleConfig, generatedSourceMeta, {
        ...baseContext,
        isGeneratedSource: true,
      }),
    ).toBe(false);
  });

  it('should keep opt-out rules when generated-code detection is disabled', () => {
    expect(
      filterGeneratedSource(ruleConfig, generatedSourceMeta, {
        ...baseContext,
        detectGeneratedCode: false,
        isGeneratedSource: true,
      }),
    ).toBe(true);
  });
});
