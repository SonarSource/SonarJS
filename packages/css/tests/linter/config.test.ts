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
import { plugins } from '../../src/rules/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { createStylelintConfig, RuleConfig } from '../../src/linter/config.js';

describe('createStylelintConfig', () => {
  it('should create a Stylelint config', () => {
    const rules: RuleConfig[] = [
      { key: 'foo', configurations: [] },
      { key: 'bar', configurations: [42] },
    ];
    const config = createStylelintConfig(rules);
    expect(config.rules).toEqual({
      foo: true,
      bar: [42],
    });
    expect(config.plugins).toEqual(plugins);
  });
});
