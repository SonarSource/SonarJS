/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S6754', () => {
  it('S6754', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(
      'The return value of "useState" should be destructured and named symmetrically',
      rule,
      {
        valid: [
          {
            code: `
      import { useState } from 'react';
      function useFoo() {
        const [foo] = useState();
        return [foo];
      }`,
          },
          {
            code: `
      import { useState } from 'react';
      function useFoo() {
        const [foo, setFoo] = useState();
      }`,
          },
          {
            code: `
      import { useState } from 'react';
      function useFoo() {
        const [Foo, setFoo] = useState();
      }`,
          },
        ],
        invalid: [
          {
            code: `
      import { useState } from 'react';
      function useFoo() {
        const [foo, bar] = useState();
        return [foo, bar];
      }`,
            errors: 1,
          },
          {
            code: `import { useState } from 'react';
        
        function foo() {
  [client.searchState, client.setSearchState] = useState(baseState);
}`,
            errors: 1,
          },
          {
            code: `
      import { useState } from 'react';
      function useFoo() {
        const getterAndSetter = useState();
      }`,
            errors: 1,
          },
        ],
      },
    );
  });
});
