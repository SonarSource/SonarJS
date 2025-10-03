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
import { rule } from './rule.js';
import { describe, it } from 'node:test';

const ruleTester = new StylelintRuleTester(rule.ruleName);
describe('S125', () => {
  it('no comment', () => ruleTester.valid({ code: 'p {}' }));

  it('no commented code', () => ruleTester.valid({ code: '/* hello, world! */' }));

  it('selector', () =>
    ruleTester.invalid({
      code: '/* p {} */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('multiple selectors', () =>
    ruleTester.invalid({
      code: '/* p, div {} */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('declaration', () =>
    ruleTester.invalid({
      code: '/* color: blue; */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('selector declaration', () =>
    ruleTester.invalid({
      code: '/* p { color: blue; } */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('multiple declarations', () =>
    ruleTester.invalid({
      code: '/* div { font-size: 20px; color: red; } */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('class selector', () =>
    ruleTester.invalid({
      code: '/* .class { background-color: red; } */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('id selector', () =>
    ruleTester.invalid({
      code: '/* #id:hover { border: 1px solid black; } */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('attribute selector', () =>
    ruleTester.invalid({
      code: '/* a[href] { color: purple; } */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('media query', () =>
    ruleTester.invalid({
      code: '/* @media (max-width: 600px) { .class { font-size: 18px; } } */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('@keyframes', () =>
    ruleTester.invalid({
      code: '/* @keyframes mymove { 0% { top: 0px; } 100% { top: 200px; } } */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('import', () =>
    ruleTester.invalid({
      code: '/* @import url("styles.css"); */',
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 1, column: 1 },
      ],
    }));

  it('multline', () =>
    ruleTester.invalid({
      code: `
/*
p {
  color: blue;
}
*/
      `,
      errors: [
        { text: 'Remove this commented out code. (sonar/no-commented-code)', line: 2, column: 1 },
      ],
    }));
});
