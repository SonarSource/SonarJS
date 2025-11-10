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
import stylelint from 'stylelint';
import { expect } from 'expect';
import { createStylelintConfig } from '../../../src/linter/config.js';

type ValidAssertion = { code: string; codeFilename?: string };
type InvalidAssertion = {
  code: string;
  codeFilename?: string;
  errors: { text?: string; line?: number; column?: number }[];
};

class StylelintRuleTester {
  private readonly config: stylelint.Config;

  constructor(rule: string, configuration?: any[]) {
    this.config = createStylelintConfig([{ key: rule, configurations: configuration ?? [] }]);
  }

  public async valid(assertion: ValidAssertion) {
    const { code, codeFilename = 'test.css' } = assertion;
    const {
      results: [{ parseErrors, warnings }],
    } = await stylelint.lint({
      code,
      codeFilename,
      config: this.config,
    });
    expect(parseErrors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  }

  public async invalid(assertion: InvalidAssertion) {
    const { code, codeFilename = 'test.css', errors } = assertion;
    const {
      results: [{ warnings }],
    } = await stylelint.lint({
      code,
      codeFilename,
      config: this.config,
    });
    expect(warnings).toHaveLength(errors.length);
    for (const [index, warning] of warnings.entries()) {
      const { text: actualMessage, line: actualLine, column: actualColumn } = warning;
      const { text: expectedMessage, line: expectedLine, column: expectedColumn } = errors[index];
      if (expectedMessage) {
        expect(actualMessage).toBe(expectedMessage);
      }
      if (expectedLine) {
        expect(actualLine).toBe(expectedLine);
      }
      if (expectedColumn) {
        expect(actualColumn).toBe(expectedColumn);
      }
    }
  }
}

export { StylelintRuleTester };
