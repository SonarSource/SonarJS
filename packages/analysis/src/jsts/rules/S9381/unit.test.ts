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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S9381', () => {
  it('S9381', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Promises should not be nested', rule, {
      valid: [
        {
          // flat chain: no nesting at all
          code: `
doThing()
  .then(a => getB(a))
  .then(b => getC(b));
`,
        },
        {
          // nesting is allowed when the inner call needs a variable from the outer callback's scope
          code: `
doThing().then(a => getB(a).then(b => getC(a, b)));
`,
        },
      ],
      invalid: [
        {
          // a .then() nested inside another .then()
          code: `
doThing().then(function (result) {
  return doSomethingElse(result).then(function (newResult) {
    return doThirdThing(newResult);
  });
});
`,
          errors: [{ messageId: 'avoidNesting' }],
        },
        {
          // a .catch() nested inside another .catch()
          code: `
doThing().catch(function (err) {
  return logError(err).catch(function () {
    return null;
  });
});
`,
          errors: [{ messageId: 'avoidNesting' }],
        },
      ],
    });
  });
});
