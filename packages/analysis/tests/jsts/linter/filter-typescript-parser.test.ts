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
import { filterTypeScriptParser } from '../../../src/jsts/linter/filters/filter-typescript-parser.js';
import type { RuleFilterContext } from '../../../src/jsts/linter/filters/index.js';
import type { SonarMeta } from '../../../src/jsts/rules/helpers/generate-meta.js';

const ruleConfig = {
  key: 'S1481',
  configurations: [],
  fileTypeTargets: ['MAIN'],
  language: 'js',
  analysisModes: ['DEFAULT'],
} satisfies RuleConfig;

const baseContext: RuleFilterContext = {
  extensionName: '.js',
  fileType: 'MAIN',
  fileLanguage: 'js',
  analysisMode: 'DEFAULT',
  detectedEsYear: undefined,
  targetEsYear: undefined,
  detectedModuleType: undefined,
  detectGeneratedCode: true,
  isGeneratedSource: false,
  isTypeScriptParser: false,
  dependencies: new Map(),
};

const requiresTypeScriptParserMeta = {
  meta: { type: 'problem', docs: {} },
  sonarKey: 'S1481',
  eslintId: 'no-unused-vars',
  scope: 'All',
  languages: ['js', 'ts'],
  implementation: 'external',
  requiredDependency: [],
  requiresTypeScriptParser: true,
} satisfies SonarMeta;

describe('filterTypeScriptParser', () => {
  it('should disable opted-in rules when Babel is the selected parser', () => {
    expect(filterTypeScriptParser(ruleConfig, requiresTypeScriptParserMeta, baseContext)).toBe(
      false,
    );
  });

  it('should keep opted-in rules when the TypeScript parser is selected', () => {
    expect(
      filterTypeScriptParser(ruleConfig, requiresTypeScriptParserMeta, {
        ...baseContext,
        isTypeScriptParser: true,
      }),
    ).toBe(true);
  });

  it('should keep rules that do not require the TypeScript parser', () => {
    expect(filterTypeScriptParser(ruleConfig, undefined, baseContext)).toBe(true);
  });
});
