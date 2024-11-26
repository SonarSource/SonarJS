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
ruleTester.run('Attempts should not be made to update "const" variables', rule, {
  valid: [],
  invalid: [
    {
      code: `
        const c = 1;
        c = 2;`,
      errors: [
        {
          message:
            '{"message":"Correct this attempt to modify \\"c\\" or use \\"let\\" in its declaration.","secondaryLocations":[{"message":"Const declaration","column":8,"line":2,"endColumn":20,"endLine":2}]}',
          line: 3,
          column: 9,
          endLine: 3,
          endColumn: 10,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const c = 1;
        var x = c++;`,
      errors: 1,
    },
  ],
});
