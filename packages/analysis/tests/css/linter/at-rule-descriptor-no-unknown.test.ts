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
import { StylelintRuleTester } from '../tools/tester/tester.js';

const ruleTester = new StylelintRuleTester('at-rule-descriptor-no-unknown');

describe('at-rule-descriptor-no-unknown', () => {
  it('accepts known descriptors in @counter-style rules', () =>
    ruleTester.valid({
      code: '@counter-style foo { system: cyclic; }',
    }));

  it('accepts known descriptors in @property rules', () =>
    ruleTester.valid({
      code: '@property --brand-color { syntax: "<color>"; inherits: false; initial-value: red; }',
    }));

  it('reports unknown descriptors in @counter-style rules', () =>
    ruleTester.invalid({
      code: '@counter-style foo { unknown-descriptor: cyclic; }',
      errors: [
        {
          text: 'Unknown descriptor "unknown-descriptor" for at-rule "@counter-style" (at-rule-descriptor-no-unknown)',
          line: 1,
        },
      ],
    }));

  it('reports unknown descriptors in @property rules', () =>
    ruleTester.invalid({
      code: '@property --brand-color { unknown-descriptor: "<color>"; }',
      errors: [
        {
          text: 'Unknown descriptor "unknown-descriptor" for at-rule "@property" (at-rule-descriptor-no-unknown)',
          line: 1,
        },
      ],
    }));

  it('does not report in scss files', () =>
    ruleTester.valid({
      code: '@counter-style foo { unknown-descriptor: cyclic; }',
      codeFilename: 'styles.scss',
    }));

  it('does not report in less files', () =>
    ruleTester.valid({
      code: '@property --x { unknown-descriptor: red; }',
      codeFilename: 'styles.less',
    }));

  // Stylelint fires on all Vue embedded blocks; transform.ts suppresses warnings
  // that come from non-CSS blocks (e.g. lang="scss"). See transform.test.ts.
  it('reports on scss content in vue files at the Stylelint layer', () =>
    ruleTester.invalid({
      code: '<style lang="scss">\n@counter-style foo { unknown-descriptor: cyclic; }\n</style>',
      codeFilename: 'component.vue',
      errors: [
        {
          text: 'Unknown descriptor "unknown-descriptor" for at-rule "@counter-style" (at-rule-descriptor-no-unknown)',
          line: 2,
        },
      ],
    }));

  it('reports unknown descriptors in vue files with no lang attribute', () =>
    ruleTester.invalid({
      code: '<style>\n@counter-style foo { unknown-descriptor: cyclic; }\n</style>',
      codeFilename: 'component.vue',
      errors: [
        {
          text: 'Unknown descriptor "unknown-descriptor" for at-rule "@counter-style" (at-rule-descriptor-no-unknown)',
          line: 2,
        },
      ],
    }));

  it('reports unknown descriptors in vue files with lang="css"', () =>
    ruleTester.invalid({
      code: '<style lang="css">\n@counter-style foo { unknown-descriptor: cyclic; }\n</style>',
      codeFilename: 'component.vue',
      errors: [
        {
          text: 'Unknown descriptor "unknown-descriptor" for at-rule "@counter-style" (at-rule-descriptor-no-unknown)',
          line: 2,
        },
      ],
    }));
});
