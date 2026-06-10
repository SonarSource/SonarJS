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

const ruleTester = new StylelintRuleTester('custom-property-no-missing-var-function');

describe('custom-property-no-missing-var-function', () => {
  it('flags custom properties declared in :root when used without var()', () =>
    ruleTester.invalid({
      code: `
        :root {
          --accent-color: red;
        }

        a {
          color: --accent-color;
        }
      `,
      errors: [
        {
          text: 'Missing var function for "--accent-color" (custom-property-no-missing-var-function)',
        },
      ],
    }));

  it('flags custom properties declared with @property when used without var()', () =>
    ruleTester.invalid({
      code: `
        @property --accent-color {
          syntax: "<color>";
          inherits: false;
          initial-value: red;
        }

        a {
          color: --accent-color;
        }
      `,
      errors: [
        {
          text: 'Missing var function for "--accent-color" (custom-property-no-missing-var-function)',
        },
      ],
    }));

  it('does not flag declarations that legitimately accept custom identifiers', () =>
    ruleTester.valid({
      code: `
        @property --fade-in {
          syntax: "<number>";
          inherits: false;
          initial-value: 0;
        }

        a {
          transition-property: --fade-in;
        }
      `,
    }));

  it('does not flag values when the custom property is not defined in the same file', () =>
    ruleTester.valid({
      code: `
        a {
          color: --accent-color;
        }
      `,
    }));
});
