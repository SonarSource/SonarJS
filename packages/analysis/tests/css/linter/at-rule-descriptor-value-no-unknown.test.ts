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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { StylelintRuleTester } from '../tools/tester/tester.js';
import { LinterWrapper } from '../../../src/css/linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';

const RULE = 'at-rule-descriptor-value-no-unknown';
const ruleTester = new StylelintRuleTester(RULE);
const vuePath = normalizeToAbsolutePath(path.join(import.meta.dirname, 'component.vue'));

describe('at-rule-descriptor-value-no-unknown', () => {
  it('accepts valid descriptor values in @counter-style rules', () =>
    ruleTester.valid({
      code: '@counter-style foo { system: numeric; }',
    }));

  it('accepts valid descriptor values in @property rules', () =>
    ruleTester.valid({
      code: '@property --accent { syntax: "<color>"; inherits: false; initial-value: red; }',
    }));

  it('reports unknown values for @counter-style descriptors', () =>
    ruleTester.invalid({
      code: '@counter-style foo { system: unknown; }',
      errors: [
        {
          text: 'Unknown value "unknown" for descriptor "system" (at-rule-descriptor-value-no-unknown)',
          line: 1,
        },
      ],
    }));

  it('does not report in scss files', () =>
    ruleTester.valid({
      code: '@counter-style foo { system: unknown; }',
      codeFilename: 'styles.scss',
    }));

  it('does not report in less files', () =>
    ruleTester.valid({
      code: '@property --x { syntax: unknown; }',
      codeFilename: 'styles.less',
    }));

  it('does not report inside a Vue <style lang="scss"> block', async () => {
    const code = [
      '<template><div></div></template>',
      '<style lang="scss">',
      '@counter-style foo { system: unknown; }',
      '</style>',
    ].join('\n');
    const linter = new LinterWrapper();
    linter.initialize([{ key: RULE, configurations: [] }]);
    const { issues } = await linter.lint(vuePath, code);
    expect(issues).toHaveLength(0);
  });

  it('reports inside a Vue <style lang="css"> block', async () => {
    const code = [
      '<template><div></div></template>',
      '<style lang="css">',
      '@counter-style foo { system: unknown; }',
      '</style>',
    ].join('\n');
    const linter = new LinterWrapper();
    linter.initialize([{ key: RULE, configurations: [] }]);
    const { issues } = await linter.lint(vuePath, code);
    expect(issues).toHaveLength(1);
    expect(issues[0].line).toBe(3);
  });

  it('reports inside a Vue <style> block with no lang attribute', async () => {
    const code = [
      '<template><div></div></template>',
      '<style>',
      '@counter-style foo { system: unknown; }',
      '</style>',
    ].join('\n');
    const linter = new LinterWrapper();
    linter.initialize([{ key: RULE, configurations: [] }]);
    const { issues } = await linter.lint(vuePath, code);
    expect(issues).toHaveLength(1);
    expect(issues[0].line).toBe(3);
  });
});
