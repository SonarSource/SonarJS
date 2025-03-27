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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S6791', () => {
  it('S6791', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run(
      'The decorator should refine both message and location, and provide a quickfix',
      rule,
      {
        valid: [
          {
            code: `
class Foo extends React.Component {
  componentDidUpdate() {}
  render() {}
}`,
          },
        ],
        invalid: [
          {
            code: `
import React from 'react';
class Component extends React.Component {
    UNSAFE_componentWillMount() {}
}`,
            errors: [
              {
                message: 'UNSAFE_componentWillMount is unsafe for use in async rendering.',
                line: 4,
                column: 5,
                endColumn: 30,
              },
            ],
          },
        ],
      },
    );
  });
});
