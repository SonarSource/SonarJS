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
import { rules } from '../external/a11y.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

// Sentinel: the undecorated upstream rule must still report the patterns our decorator suppresses.
// There is no known pending upstream fix for `heading-has-content`; the gap comes from
// `jsx-ast-utils.hasProp` defaulting to `spreadStrict: true`, so spread attributes never establish
// prop presence. If this test starts failing, upstream (or `jsx-ast-utils`) began resolving spreads
// itself and packages/analysis/src/jsts/rules/S6850/decorator.ts should be revisited — possibly
// removed, possibly narrowed to whatever upstream still misses.
describe('S6850 upstream sentinel', () => {
  it('upstream heading-has-content still reports a heading fed through a spread', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('heading-has-content', rules['heading-has-content'], {
      valid: [],
      invalid: [{ code: `<h1 {...{ children: 'Title' }} />;`, errors: 1 }],
    });
  });
});
