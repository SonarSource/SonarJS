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
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';
import parser from 'vue-eslint-parser';

describe('S9011', () => {
  it('React', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Rule S9011 - React', rule, {
      valid: [
        { code: `const b = <button type="submit">Search</button>;` },
        { code: `const b = <button type="button">Clear</button>;` },
        { code: `const b = <button type="reset">Reset</button>;` },
        {
          // ternary of two valid literals is fully analyzable and considered compliant
          code: `const b = <button type={isSubmit ? 'submit' : 'button'}>Go</button>;`,
        },
        {
          // dynamic type expression: can't be judged statically, must not be reported
          code: `const b = <button type={computedType}>Go</button>;`,
        },
        {
          code: `React.createElement('button', { type: 'submit' });`,
        },
        {
          // not a button
          code: `const d = <div>Search</div>;`,
        },
      ],
      invalid: [
        {
          code: `const b = <button>Search</button>;`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `React.createElement('button', {});`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `const b = <button type="action">Save</button>;`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
        {
          // ternary with one invalid literal branch is still statically analyzable
          code: `const b = <button type={isSubmit ? 'submit' : 'action'}>Go</button>;`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
      ],
    });
  });

  it('Vue', () => {
    const ruleTester = new NoTypeCheckingRuleTester({ parser });

    ruleTester.run('Rule S9011 - Vue', rule, {
      valid: [
        {
          code: `<template><button type="submit">Search</button></template>`,
        },
        {
          code: `<template><button type="button">Clear</button></template>`,
        },
        {
          // bound dynamic type with a real expression: can't be judged statically
          code: `<template><button :type="computedType">Go</button></template>`,
        },
        {
          code: `<template><div>Search</div></template>`,
        },
      ],
      invalid: [
        {
          code: `<template><button>Search</button></template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `<template><button type="">Search</button></template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `<template><button :type="">Search</button></template>`,
          errors: [{ message: 'Add an explicit "type" attribute to this button.' }],
        },
        {
          code: `<template><button type="action">Save</button></template>`,
          errors: [
            {
              message:
                'Replace this invalid "type" value "action" with one of "button", "submit", or "reset".',
            },
          ],
        },
      ],
    });
  });
});
