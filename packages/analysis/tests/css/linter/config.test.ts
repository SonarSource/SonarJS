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
import { LinterWrapper } from '../../../src/css/linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { createConfiguration } from '../../../src/common/configuration.js';
import { cssOnlyRuleKeys } from '../../../src/css/linter/css-only-rules.js';

describe('createStylelintConfig', () => {
  it('allows mixin scoping while preserving configured at-rule exceptions', () => {
    const config = createStylelintConfig([
      {
        key: 'nesting-selector-no-missing-scoping-root',
        configurations: [true, { ignoreAtRules: ['custom'] }],
      },
    ]);
    expect(config.rules?.['nesting-selector-no-missing-scoping-root']).toEqual([
      true,
      { ignoreAtRules: ['mixin', 'include', 'custom'] },
    ]);
  });

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
      const cssOverride = config.overrides?.find(o => (o.files as string[])?.includes('**/*.css'));
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

describe('preprocessor rule applicability', () => {
  for (const extension of ['css', 'scss', 'less']) {
    it(`keeps root nesting checks and applies import placement appropriately in ${extension}`, async () => {
      const linter = new LinterWrapper();
      linter.initialize(
        ['nesting-selector-no-missing-scoping-root', 'no-invalid-position-at-import-rule'].map(
          key => ({ key, configurations: [] }),
        ),
      );
      const { issues } = await linter.lint(
        normalizeToAbsolutePath(`/tmp/applicability.${extension}`),
        '&:hover { color: red; }\n@import "other";',
      );
      const expected = ['nesting-selector-no-missing-scoping-root'];
      if (extension === 'css') {
        expected.push('no-invalid-position-at-import-rule');
      }
      expect(issues.map(issue => issue.ruleId).sort()).toEqual(expected.sort());
    });
  }

  it('allows deferred SCSS mixin/include scope while checking the body', async () => {
    const linter = new LinterWrapper();
    linter.initialize(
      ['nesting-selector-no-missing-scoping-root', 'color-no-invalid-hex'].map(key => ({
        key,
        configurations: [],
      })),
    );
    const { issues } = await linter.lint(
      normalizeToAbsolutePath('/tmp/applicability.scss'),
      '@mixin theme { &:hover { color: #ggg; } }\na { @include theme { &:focus { color: red; } } }',
    );
    expect(issues).toEqual([expect.objectContaining({ ruleId: 'color-no-invalid-hex', line: 1 })]);
  });
});

describe('custom stylesheet suffixes', () => {
  it('selects plain CSS before a broader preprocessor suffix', async () => {
    const linter = new LinterWrapper();
    linter.initialize(
      [{ key: 'no-invalid-position-at-import-rule', configurations: [] }],
      undefined,
      createConfiguration({ baseDir: '/tmp', cssSuffixes: ['.plain.tpl'], lessSuffixes: ['.tpl'] }),
    );
    const { issues } = await linter.lint(
      normalizeToAbsolutePath('/tmp/theme.plain.tpl'),
      'a { color: red; }\n@import "other";',
    );
    expect(issues.map(issue => issue.ruleId)).toEqual(['no-invalid-position-at-import-rule']);
  });

  for (const extension of ['SASS.TPL', 'module.css']) {
    for (const ruleFileType of ['MAIN', 'TEST'] as const) {
      it(`uses the longest matching suffix for ${extension} with ${ruleFileType} rule selection`, async () => {
        const linter = new LinterWrapper();
        linter.initialize(
          [
            { key: 'color-no-invalid-hex', configurations: [] },
            { key: 'no-invalid-position-at-import-rule', configurations: [] },
          ],
          undefined,
          createConfiguration({
            baseDir: '/tmp',
            sassSuffixes: ['.sass.tpl', '.module.css'],
            lessSuffixes: ['.tpl'],
          }),
        );
        const filePath = normalizeToAbsolutePath(`/tmp/theme.${extension}`);
        const { issues, root } = await linter.lint(
          filePath,
          'a\n  color: #ggg\n@import "other"',
          ruleFileType,
        );
        expect(root).toBeDefined();
        expect(root?.source?.input.file).toBe(filePath);
        expect(issues.map(issue => issue.ruleId)).toEqual(
          ruleFileType === 'MAIN' ? ['color-no-invalid-hex'] : [],
        );
      });
    }
  }

  it('allows reassigning an extension after removing it from its original dialect', async () => {
    const linter = new LinterWrapper();
    linter.initialize(
      [],
      undefined,
      createConfiguration({ baseDir: '/tmp', scssSuffixes: [], sassSuffixes: ['.scss'] }),
    );
    expect(
      (await linter.lint(normalizeToAbsolutePath('/tmp/input.SCSS'), 'a\n  color: red')).issues,
    ).toEqual([]);
  });

  it('resets dialect selection and rule configs between analyses', async () => {
    const linter = new LinterWrapper();
    const rules = [{ key: 'no-invalid-position-at-import-rule', configurations: [] }];
    linter.initialize(
      rules,
      undefined,
      createConfiguration({ baseDir: '/tmp', lessSuffixes: ['.txt'] }),
    );
    const file = normalizeToAbsolutePath('/tmp/input.txt');
    const code = 'a { color: red; }\n@import "other";';
    expect((await linter.lint(file, code)).issues).toEqual([]);
    linter.initialize(rules);
    expect((await linter.lint(file, code)).issues.map(issue => issue.ruleId)).toEqual([
      'no-invalid-position-at-import-rule',
    ]);
  });

  const configuration = createConfiguration({
    baseDir: '/tmp',
    cssSuffixes: [
      '.txt',
      '.css',
      '.scss',
      '.sass',
      '.less',
      '.custom-scss',
      '.custom-sass',
      '.custom-less',
    ],
    scssSuffixes: ['.scss', '.custom-scss'],
    sassSuffixes: ['.sass', '.custom-sass'],
    lessSuffixes: ['.less', '.custom-less'],
  });

  for (const [extension, code] of [
    ['custom-sass', 'a\n  color: #ggg\n  background: blue'],
    ['custom-scss', '$name: foo; .#{$name} { color: #ggg; }'],
    ['CUSTOM-SCSS', '$name: foo; .#{$name} { color: #ggg; }'],
    ['custom-less', '.mixin(@a; @b) { color: #ggg; }'],
  ]) {
    for (const ruleFileType of ['MAIN', 'TEST'] as const) {
      it(`parses ${extension} with ${ruleFileType} rule selection`, async () => {
        const linter = new LinterWrapper();
        linter.initialize(
          [{ key: 'color-no-invalid-hex', configurations: [] }],
          undefined,
          configuration,
        );
        const filePath = normalizeToAbsolutePath(`/tmp/input.${extension}`);
        const { issues, root } = await linter.lint(filePath, code, ruleFileType);
        expect(root).toBeDefined();
        expect(root?.source?.input.file).toBe(filePath);
        expect(issues.map(issue => issue.ruleId)).toEqual(
          ruleFileType === 'MAIN' ? ['color-no-invalid-hex'] : [],
        );
      });
    }
  }

  for (const extension of [
    'txt',
    'css',
    'custom-scss',
    'scss',
    'custom-less',
    'less',
    'custom-sass',
    'sass',
  ]) {
    it(`applies CSS-only rules appropriately to ${extension}`, async () => {
      const linter = new LinterWrapper();
      linter.initialize(
        [{ key: 'no-invalid-position-at-import-rule', configurations: [] }],
        undefined,
        configuration,
      );
      expect(linter.hasActiveRules()).toBe(true);
      const { issues } = await linter.lint(
        normalizeToAbsolutePath(`/tmp/input.${extension}`),
        extension.endsWith('sass')
          ? 'a\n  color: red\n@import "other"'
          : 'a { color: red; }\n@import "other";',
      );
      expect(issues.map(issue => issue.ruleId)).toEqual(
        ['txt', 'css'].includes(extension) ? ['no-invalid-position-at-import-rule'] : [],
      );
    });
  }

  for (const [extension, code] of [
    ['custom-scss', '$color: red !default;'],
    ['custom-sass', '$color: red !global'],
  ]) {
    it(`uses the selected dialect for Sass annotations in ${extension}`, async () => {
      const linter = new LinterWrapper();
      linter.initialize(
        [{ key: 'sonar/annotation-no-unknown', configurations: [] }],
        undefined,
        configuration,
      );
      const { issues } = await linter.lint(
        normalizeToAbsolutePath(`/tmp/input.${extension}`),
        code,
      );
      expect(issues).toEqual([]);
    });
  }
});
