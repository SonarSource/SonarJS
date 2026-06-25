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
import { describe, it, beforeEach, afterEach } from 'node:test';
import { expect } from 'expect';
import { createStylelintConfig, RuleConfig } from '../../../src/css/linter/config.js';
import { cssOnlyRuleKeys } from '../../../src/css/linter/css-only-rules.js';

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

  describe('CSS-only rule routing', () => {
    beforeEach(() => cssOnlyRuleKeys.add('css-only-rule'));
    afterEach(() => cssOnlyRuleKeys.delete('css-only-rule'));

    it('routes CSS-only rules to the css override only, not global rules', () => {
      const rules: RuleConfig[] = [
        { key: 'css-only-rule', configurations: [] },
        { key: 'regular-rule', configurations: [] },
      ];
      const config = createStylelintConfig(rules);

      // CSS-only rule must NOT be in the global rules block
      expect(config.rules).not.toHaveProperty('css-only-rule');
      // Regular rule IS in the global rules block
      expect(config.rules).toHaveProperty('regular-rule', true);
    });

    it('includes CSS-only rules in the **/*.css override', () => {
      const config = createStylelintConfig([{ key: 'css-only-rule', configurations: [] }]);
      const cssOverride = config.overrides?.find(o =>
        (o.files as string[])?.includes('**/*.css'),
      );
      expect(cssOverride?.rules).toHaveProperty('css-only-rule', true);
    });

    it('includes CSS-only rules in the HTML/Vue override', () => {
      const config = createStylelintConfig([{ key: 'css-only-rule', configurations: [] }]);
      const htmlOverride = config.overrides?.find(
        o => o.customSyntax != null && !(o.files as string[])?.includes('**/*.css'),
      );
      expect(htmlOverride?.rules).toHaveProperty('css-only-rule', true);
    });

    it('does not include CSS-only rules in scss/sass/less overrides', () => {
      const config = createStylelintConfig([{ key: 'css-only-rule', configurations: [] }]);
      const preprocessorOverrides = config.overrides?.filter(o =>
        ['**/*.scss', '**/*.sass', '**/*.less'].some(g => (o.files as string[])?.includes(g)),
      );
      for (const override of preprocessorOverrides ?? []) {
        expect(override.rules ?? {}).not.toHaveProperty('css-only-rule');
      }
    });
  });
});
