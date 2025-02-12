/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import type { Rule } from 'eslint';
import { describe, beforeEach, it } from 'node:test';
import { expect } from 'expect';
import { setContext } from '../../../../shared/src/helpers/context.js';
import { createLinterConfig } from '../../../src/linter/config/linter-config.js';
import { RuleConfig } from '../../../src/linter/config/rule-config.js';

describe('createLinterConfig', () => {
  beforeEach(() => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should enable environments', () => {
    const { globals } = createLinterConfig([], {}, ['node', 'jquery']).languageOptions;
    expect(globals).toHaveProperty('__dirname');
    expect(globals).toHaveProperty('$');
  });

  it('should enable globals', () => {
    const { globals } = createLinterConfig([], {}, [], ['_', '$']).languageOptions;
    expect(globals).toHaveProperty('_');
    expect(globals).toHaveProperty('$');
  });

  it('should enable rules', () => {
    const inputRules: RuleConfig[] = [
      {
        key: 'foo',
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ];
    const linterRules = {
      foo: { module: 42 } as unknown as Rule.RuleModule,
      bar: { module: 24 } as unknown as Rule.RuleModule,
    };
    const { rules } = createLinterConfig(inputRules, linterRules);
    expect(rules).toEqual(
      expect.objectContaining({
        'sonarjs/foo': ['error'],
      }),
    );
  });

  it('should enable internal custom rules by default', () => {
    const { rules } = createLinterConfig([], {});
    expect(rules).toEqual({
      'sonarjs/internal-cognitive-complexity': ['error', 'metric'],
      'sonarjs/internal-symbol-highlighting': ['error'],
    });
  });

  it('should not enable internal custom rules in SonarLint context', () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: true,
      bundles: [],
    });
    const { rules } = createLinterConfig([], {});
    expect(rules).toEqual({});
  });
});
