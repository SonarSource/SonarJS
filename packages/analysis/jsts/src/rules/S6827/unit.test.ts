/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { rules } from '../external/a11y.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S6827 upstream canary', () => {
  it('upstream anchor-has-content should still report on JSX spread attributes', () => {
    // This test uses the upstream eslint-plugin-jsx-a11y anchor-has-content rule directly,
    // without the SonarJS decorator. It expects the upstream rule to still flag anchors
    // with only spread attributes (e.g. <a {...props} />) as inaccessible.
    //
    // When the upstream releases commit e6bfd5cb7c (which suppresses reports on spread
    // attributes), this test will fail — that is the signal to revert the SonarJS decorator
    // in packages/analysis/jsts/src/rules/S6827/decorator.ts and remove all files in S6827/.
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('anchor-has-content', rules['anchor-has-content'], {
      valid: [],
      invalid: [
        {
          code: `<a {...this.props} />;`,
          errors: 1,
        },
        {
          code: `<a {...props} target="_blank" rel="noopener noreferrer" />;`,
          errors: 1,
        },
      ],
    });
  });
});
