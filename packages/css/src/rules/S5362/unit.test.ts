/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { StylelintRuleTester } from '../../../tests/tools/tester/index.js';
import { messages, rule } from './rule.js';
import { describe, it } from 'node:test';

const ruleTester = new StylelintRuleTester(rule.ruleName);
describe('S5362', () => {
  it('single expression', () =>
    ruleTester.valid({
      code: '.foo {width: calc(100%);}',
    }));

  it('compound expression', () =>
    ruleTester.valid({
      code: '.foo {width: calc(100% - 80px + 60pt);}',
    }));

  it('division by 1', () =>
    ruleTester.valid({
      code: '.foo {width: calc(100% / 1);}',
    }));

  it('division by 0.1', () =>
    ruleTester.valid({
      code: '.foo {width: calc(100% / 0.1);}',
    }));

  it('division by 1px', () =>
    ruleTester.valid({
      code: '.foo {width: calc(100% / 1px);}',
    }));

  it('comma divider', () =>
    ruleTester.valid({
      code: '.foo {width: calc(100% + var(--text-color, 0px));}',
    }));

  it('empty expression', () =>
    ruleTester.invalid({
      code: '.foo {width: calc();}',
      errors: [{ text: `${messages.empty} (sonar/function-calc-no-invalid)`, line: 1, column: 7 }],
    }));

  it('space-only expression', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(   );}',
      errors: [{ text: `${messages.empty} (sonar/function-calc-no-invalid)` }],
    }));

  it('comment-only expression', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(/* this a comment */);}',
      errors: [{ text: `${messages.empty} (sonar/function-calc-no-invalid)` }],
    }));

  it('missing operator', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(100% 80px);}',
      errors: [{ text: `${messages.malformed} (sonar/function-calc-no-invalid)` }],
    }));

  it('division by 0', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(100% / 0);}',
      errors: [{ text: `${messages.divByZero} (sonar/function-calc-no-invalid)` }],
    }));

  it('division by 0.0', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(100% / 0.0);}',
      errors: [{ text: `${messages.divByZero} (sonar/function-calc-no-invalid)` }],
    }));

  it('division by 0px', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(100% / 0px);}',
      errors: [{ text: `${messages.divByZero} (sonar/function-calc-no-invalid)` }],
    }));

  it('sibling calc-s', () =>
    ruleTester.invalid({
      code: '.foo {width: calc() + calc(100% / 0px);}',
      errors: [
        { text: `${messages.empty} (sonar/function-calc-no-invalid)`, line: 1, column: 7 },
        { text: `${messages.divByZero} (sonar/function-calc-no-invalid)`, line: 1, column: 7 },
      ],
    }));

  it('nested calc-s', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(100% / 0px + calc());}',
      errors: [
        { text: `${messages.divByZero} (sonar/function-calc-no-invalid)` },
        { text: `${messages.empty} (sonar/function-calc-no-invalid)` },
      ],
    }));

  it('nested expressions', () =>
    ruleTester.invalid({
      code: '.foo {width: calc(100 + ("foo" / (-0.9) * abs(80%) (70px+"bar")));}',
      errors: [
        { text: `${messages.malformed} (sonar/function-calc-no-invalid)` },
        { text: `${messages.malformed} (sonar/function-calc-no-invalid)` },
      ],
    }));
});
