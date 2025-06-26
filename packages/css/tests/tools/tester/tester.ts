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
import stylelint from 'stylelint';
import { describe, it } from 'node:test';
import { expect } from 'expect';

type ValidAssertion = { description: string; code: string };
type InvalidAssertion = {
  description: string;
  code: string;
  errors: { text?: string; line?: number; column?: number }[];
};

class StylelintRuleTester {
  private readonly config: stylelint.Config;

  constructor(rule: { ruleName: string; rule: stylelint.Rule }) {
    stylelint.rules[rule.ruleName] = rule.rule;
    this.config = { rules: { [rule.ruleName]: true } };
  }

  run(description: string, assertions: { valid: ValidAssertion[]; invalid: InvalidAssertion[] }) {
    describe(description, () => {
      assertions.valid.forEach(assertion => StylelintRuleTester.accept(assertion, this.config));
      assertions.invalid.forEach(assertion => StylelintRuleTester.reject(assertion, this.config));
    });
  }

  private static accept(assertion: ValidAssertion, config: stylelint.Config) {
    const { description, code } = assertion;
    it(description, async () => {
      const {
        results: [{ parseErrors, warnings }],
      } = await stylelint.lint({
        code,
        config,
      });
      expect(parseErrors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
    });
  }

  private static reject(assertion: InvalidAssertion, config: stylelint.Config) {
    const { description, code, errors } = assertion;
    it(description, async () => {
      const {
        results: [{ warnings }],
      } = await stylelint.lint({
        code,
        config,
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
    });
  }
}

export { StylelintRuleTester };
