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
import { filterVendorFile } from '../../../src/jsts/linter/filters/filter-vendor-file.js';
import type { RuleFilterContext } from '../../../src/jsts/linter/filters/index.js';
import type { SonarMeta } from '../../../src/jsts/rules/helpers/generate-meta.js';

const ruleConfig: RuleConfig = {
  key: 'S0000',
  configurations: [],
  fileTypeTargets: ['MAIN'],
  language: 'js',
  analysisModes: ['DEFAULT'],
};

function ruleMeta(skipOnVendorFile?: boolean): SonarMeta {
  return {
    meta: {},
    sonarKey: 'S0000',
    eslintId: 'dummy',
    scope: 'Main',
    languages: ['js'],
    implementation: 'original',
    requiredDependency: [],
    skipOnVendorFile,
  };
}

const baseContext: RuleFilterContext = {
  extensionName: '.js',
  fileType: 'MAIN',
  classification: {
    isVendorFile: false,
    isTestCaseFile: false,
    isGeneratedSource: false,
  },
  fileLanguage: 'js',
  analysisMode: 'DEFAULT',
  detectedEsYear: undefined,
  targetEsYear: undefined,
  detectedModuleType: undefined,
  detectGeneratedCode: true,
  dependencies: new Map(),
};

describe('filterVendorFile', () => {
  it('should keep opt-out rules for non-vendor files', () => {
    expect(filterVendorFile(ruleConfig, ruleMeta(true), baseContext)).toBe(true);
  });

  it('should disable opt-out rules for vendor files', () => {
    expect(
      filterVendorFile(ruleConfig, ruleMeta(true), {
        ...baseContext,
        classification: { ...baseContext.classification, isVendorFile: true },
      }),
    ).toBe(false);
  });

  it('should keep rules without a vendor opt-out, including bundle rules', () => {
    const context = {
      ...baseContext,
      classification: { ...baseContext.classification, isVendorFile: true },
    };
    for (const meta of [ruleMeta(), ruleMeta(false), undefined]) {
      expect(filterVendorFile(ruleConfig, meta, context)).toBe(true);
    }
  });
});
