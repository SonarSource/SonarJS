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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rules } from '../external/a11y.js';
import { rule } from './index.js';

describe('S6845 upstream sentinel', () => {
  it('upstream no-noninteractive-tabindex reports editable hosts', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-noninteractive-tabindex', rules['no-noninteractive-tabindex'], {
      valid: [],
      invalid: [
        { code: '<div contentEditable tabIndex={0} />', errors: 1 },
        { code: '<span contentEditable="plaintext-only" tabIndex="0" />', errors: 1 },
      ],
    });
  });
});

describe('S6845', () => {
  it('allows tabIndex on statically editable HTML hosts only', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-noninteractive-tabindex', rule, {
      valid: [
        { code: '<div contentEditable tabIndex={0} />' },
        { code: '<span contentEditable="true" tabIndex="0" />' },
        { code: '<span contentEditable="plaintext-only" tabIndex="0" />' },
        { code: '<span contenteditable="TRUE" tabIndex="0" />' },
      ],
      invalid: [
        { code: '<div tabIndex={0} />', errors: 1 },
        { code: '<div contentEditable={false} tabIndex={0} />', errors: 1 },
        { code: '<div contentEditable="false" tabIndex={0} />', errors: 1 },
        { code: '<div contentEditable={editable} tabIndex={0} />', errors: 1 },
        { code: '<div contentEditable="inherit" tabIndex={0} />', errors: 1 },
        { code: '<div {...{ contentEditable: true }} tabIndex={0} />', errors: 1 },
        { code: '<div contentEditable {...props} tabIndex={0} />', errors: 1 },
        { code: '<div contentEditable contentEditable={false} tabIndex={0} />', errors: 1 },
        {
          code: '<Editable contentEditable tabIndex={0} />',
          settings: { 'jsx-a11y': { components: { Editable: 'div' } } },
          errors: 1,
        },
      ],
    });
  });
});
