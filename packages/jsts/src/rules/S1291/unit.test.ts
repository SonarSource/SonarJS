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
ruleTester.run('"NOSONAR" comments should not be used', rule, {
  valid: [
    {
      code: '//',
    },
    {
      code: '/* */',
    },
    {
      code: '// foo',
    },
    {
      code: '/* foo */',
    },
    {
      code: '// no sonar',
    },
    {
      code: '/* no sonar */',
    },
  ],
  invalid: [
    {
      code: '// NOSONAR',
      errors: [
        {
          message: '"NOSONAR" comments should not be used.',
          line: 1,
          column: 1,
        },
      ],
    },
    {
      code: '// nosonar',
      errors: 1,
    },
    {
      code: '/* NOSONAR */',
      errors: 1,
    },
    {
      code: '/* nosonar */',
      errors: 1,
    },
    {
      code: '// NOSONARSOURCE',
      errors: 1,
    },
    {
      code: '/* NOSONARSOURCE */',
      errors: 1,
    },
  ],
});
