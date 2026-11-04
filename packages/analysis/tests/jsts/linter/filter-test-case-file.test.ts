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
import { filterTestCaseFile } from '../../../src/jsts/linter/filters/filter-test-case-file.js';
import type { RuleFilterContext } from '../../../src/jsts/linter/filters/index.js';
import type { SonarMeta } from '../../../src/jsts/rules/helpers/generate-meta.js';

const ruleConfig: RuleConfig = {
  key: 'S0000',
  configurations: [],
  fileTypeTargets: ['TEST'],
  language: 'js',
  analysisModes: ['DEFAULT'],
};

function ruleMeta(requiredTestCaseFile?: boolean): SonarMeta {
  return {
    meta: {},
    sonarKey: 'S0000',
    eslintId: 'dummy',
    scope: 'Tests',
    languages: ['js'],
    implementation: 'original',
    requiredDependency: [],
    requiredTestCaseFile,
  };
}

const baseContext: RuleFilterContext = {
  extensionName: '.js',
  fileType: 'TEST',
  isTestCaseFile: false,
  fileLanguage: 'js',
  analysisMode: 'DEFAULT',
  detectedEsYear: undefined,
  targetEsYear: undefined,
  detectedModuleType: undefined,
  detectGeneratedCode: true,
  isGeneratedSource: false,
  dependencies: new Map(),
};

describe('filterTestCaseFile', () => {
  it('should keep rules requiring test-case files on test-case files', () => {
    expect(
      filterTestCaseFile(ruleConfig, ruleMeta(true), { ...baseContext, isTestCaseFile: true }),
    ).toBe(true);
  });

  it('should disable rules requiring test-case files on other files', () => {
    expect(filterTestCaseFile(ruleConfig, ruleMeta(true), baseContext)).toBe(false);
  });

  it('should keep rules not requiring test-case files regardless of the filename', () => {
    expect(filterTestCaseFile(ruleConfig, ruleMeta(), baseContext)).toBe(true);
    expect(filterTestCaseFile(ruleConfig, ruleMeta(false), baseContext)).toBe(true);
  });

  it('should keep bundle rules without metadata', () => {
    expect(filterTestCaseFile(ruleConfig, undefined, baseContext)).toBe(true);
  });
});
