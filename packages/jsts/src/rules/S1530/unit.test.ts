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
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1530', () => {
  it('S1530', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(`Function declarations should not be made within blocks`, rule, {
      valid: [
        {
          code: `
        if (x) {
          let foo;
          foo = function() {}      // OK
        }
      
        if (x) {
          // empty block
        }
      
        p => {
          var foo = function() {}; // OK
          function foo2() { } // OK
        };

        function doSomething() {
            function doAnotherThing() { } // OK
        } 
        
        class A {
            f() { // OK
                function nested() { } // OK
            }
        }`,
        },
      ],
      invalid: [
        {
          code: `
      if (x) {
        function foo() {
        }        
      }`,
          errors: [
            {
              message: `Do not use function declarations within blocks.`,
              line: 3,
              column: 18,
              endLine: 3,
              endColumn: 21,
            },
          ],
        },
      ],
    });

    const ruleTesterTS = new NoTypeCheckingRuleTester();

    ruleTesterTS.run(`Function declarations should not be made within blocks`, rule, {
      valid: [
        {
          code: `
        interface I {
            isOk(): boolean;
        }`,
        },
        {
          code: `
        namespace space {
            function f() {}
            export function f2() {}
        }`,
        },
      ],
      invalid: [
        {
          code: `
          namespace space {
            if (x) {
              function foo() {}        
            }
          }`,
          errors: 1,
        },
      ],
    });
  });
});
