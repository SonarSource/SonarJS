/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { SONAR_RUNTIME } from '../../../src/rules/index.js';
import { extendRuleConfig, RuleConfig } from '../../../src/linter/config/rule-config.js';
import { setContext } from '../../../../shared/src/helpers/context.js';
import { SONAR_CONTEXT } from '../../../src/linter/parameters/sonar-context.js';

describe('extendRuleConfig', () => {
  it('should include `sonar-runtime`', () => {
    const ruleModule = {
      meta: { schema: [{ enum: SONAR_RUNTIME }] },
    } as unknown as Rule.RuleModule;
    const inputRule: RuleConfig = {
      key: 'some-rule',
      configurations: [42],
      fileTypeTarget: ['MAIN'],
    };

    const config = extendRuleConfig(ruleModule, inputRule);
    expect(config).toEqual([42, SONAR_RUNTIME]);
  });

  it('should include the context', () => {
    const ctx = {
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    };
    setContext(ctx);

    const ruleModule = {
      meta: { schema: [{ title: SONAR_CONTEXT }] },
    } as unknown as Rule.RuleModule;
    const inputRule: RuleConfig = {
      key: 'some-rule',
      configurations: [42],
      fileTypeTarget: ['MAIN'],
    };

    const config = extendRuleConfig(ruleModule, inputRule);
    expect(config).toEqual([42, ctx]);
  });

  it('should include the context and `sonar-runtime`', () => {
    const ctx = {
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    };
    setContext(ctx);

    const ruleModule = {
      meta: { schema: [{ enum: SONAR_RUNTIME, title: SONAR_CONTEXT }] },
    } as unknown as Rule.RuleModule;
    const inputRule: RuleConfig = {
      key: 'some-rule',
      configurations: [42],
      fileTypeTarget: ['MAIN'],
    };

    const config = extendRuleConfig(ruleModule, inputRule);
    expect(config).toEqual([42, SONAR_RUNTIME, ctx]);
  });
});
