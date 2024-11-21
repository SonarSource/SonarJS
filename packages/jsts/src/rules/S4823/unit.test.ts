/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Using command line arguments is security-sensitive', rule, {
  valid: [
    {
      code: `foo.bar`,
    },
    {
      code: `process.argvFoo`,
    },
    {
      code: `processFoo.argv`,
    },
    {
      code: `'process.argv'`,
    },
  ],
  invalid: [
    {
      code: `let x = process.argv;`,
      errors: [
        {
          message: 'Make sure that command line arguments are used safely here.',
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 21,
        },
      ],
    },
    {
      code: `\`argument 0: \${process.argv[0]}\``,
      errors: 1,
    },
  ],
});
