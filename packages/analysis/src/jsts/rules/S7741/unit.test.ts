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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7741', () => {
  it('S7741', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('no-typeof-undefined', rule, {
      valid: [
        // JS-2369: SOME_GLOBAL has no reaching declaration, so `typeof` is the only safe check
        {
          code: `
            if (typeof SOME_GLOBAL === "undefined") {
              init();
            }
          `,
        },
        // JS-2369: the base of the member access chain has no reaching declaration either,
        // so accessing `.flag` on it is just as unsafe to rewrite
        {
          code: `
            if (typeof SOME_UNDECLARED_NAMESPACE.flag === "undefined") {
              init();
            }
          `,
        },
      ],
      invalid: [
        // A declared identifier is safe to compare directly against `undefined`
        {
          code: `
            let x;
            if (typeof x === "undefined") {
              init();
            }
          `,
          output: `
            let x;
            if (x === undefined) {
              init();
            }
          `,
          errors: 1,
        },
        // The root of the member access chain is declared, so accessing `.prop` is safe
        {
          code: `
            const obj = {};
            if (typeof obj.prop === "undefined") {
              init();
            }
          `,
          output: `
            const obj = {};
            if (obj.prop === undefined) {
              init();
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
