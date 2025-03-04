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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { extendRuleConfig, RuleConfig } from '../../../src/linter/config/rule-config.js';
import { SONAR_CONTEXT } from '../../../src/linter/parameters/sonar-context.js';
import { ESLintConfiguration } from '../../../src/rules/helpers/configs.js';

describe('extendRuleConfig', () => {
  it('should include the context', () => {
    const inputRule: RuleConfig = {
      key: 'some-rule',
      configurations: [42],
      fileTypeTargets: ['MAIN'],
      language: 'js',
      analysisModes: ['DEFAULT'],
    };

    // @ts-ignore
    const config = extendRuleConfig(
      { sonarKey: 'some-rule', meta: {}, schema: [{ title: SONAR_CONTEXT }] },
      inputRule,
      '/tmp/dir',
    );
    expect(config).toEqual([42, { workDir: '/tmp/dir' }]);
  });

  it('should merge with a simple default configuration with sonar runtime present', () => {
    const inputRule: RuleConfig = {
      key: 'some-rule',
      configurations: [42],
      fileTypeTargets: ['MAIN'],
      language: 'js',
      analysisModes: ['DEFAULT'],
    };
    const defaultConfiguration: ESLintConfiguration = [
      { default: 100, type: 'integer' },
      [
        {
          field: 'format',
          type: 'string',
          default: 'allow',
        },
      ],
    ];
    const config = extendRuleConfig(
      // @ts-ignore
      {
        sonarKey: 'some-rule',
        meta: {},
        schema: [{ title: SONAR_CONTEXT }],
        fields: defaultConfiguration,
      },
      inputRule,
      '/tmp/dir',
    );
    expect(config).toEqual([42, { format: 'allow' }, { workDir: '/tmp/dir' }]);
  });

  it('should use default configuration when empty configuration provided', () => {
    const inputRule: RuleConfig = {
      key: 'some-rule',
      configurations: [],
      fileTypeTargets: ['MAIN'],
      language: 'js',
      analysisModes: ['DEFAULT'],
    };
    const defaultConfiguration: ESLintConfiguration = [
      { default: 100, type: 'integer' },
      [
        {
          field: 'format',
          type: 'string',
          default: 'allow',
        },
      ],
    ];
    const config = extendRuleConfig(
      { meta: {}, sonarKey: 'some-rule', fields: defaultConfiguration },
      inputRule,
      '/tmp/dir',
    );
    expect(config).toEqual([100, { format: 'allow' }]);
  });
});
