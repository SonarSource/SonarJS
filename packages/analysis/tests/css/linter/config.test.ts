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
import { sonarRules } from '../../../src/css/rules/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { createStylelintConfig, RuleConfig } from '../../../src/css/linter/config.js';

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
    for (const sonarRule of sonarRules) {
      expect(config.plugins).toContain(sonarRule);
    }
  });
});
