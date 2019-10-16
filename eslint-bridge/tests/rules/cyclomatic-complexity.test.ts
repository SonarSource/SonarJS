/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/cyclomatic-complexity";
import { IssueLocation, EncodedMessage } from "eslint-plugin-sonarjs/lib/utils/locations";

const threshold = 2;

ruleTester.run("Functions should not be too complex", rule, {
  valid: [
    {
      code: `if (x) {}`,
      options: [threshold],
    },
    {
      code: `
      function ok2() { // +1
        if (x) {       // +1
          return 0;    // +0
        } else {       // +0
          return 1;    // +0
        }
      }
      `,
      options: [threshold],
    },
    {
      code: `
      function ok() {          // OK            +1 for ok
        a = true && false;     //               +1 for ok
        b = function foo() {   // OK            +1 for foo, +0 for ok
          if (x) {             //               +1 for foo
          }
          return 1;
        }
      }
      `,
      options: [threshold],
    },
    {
      code: `
      function ok() {          // OK            +1 for ok
        a = true && false;     //               +1 for ok
        b = arr.map(s => s.length);   // OK     +0 for ok
      }
      `,
      options: [threshold],
    },
    {
      code: `
      function ok() {          // OK            +1 for ok
        a = true && false;     //               +1 for ok
        b = () => 10;          // OK            +0 for ok
      }
      `,
      options: [threshold],
    },
    {
      code: `
      function nesting() {     // OK            +1 for nesting
        function nested() {    // OK            +1 for nested
          if (x) {             //               +1 for nested
          }
          return 1;            //               +0 for nested
        }
      }
      `,
      options: [threshold],
    },
    {
      code: `
      function ok() {           // OK           +1 for ok
        return {                //              +0 for ok
          get x() {             // OK           +1 for x
            if (c) {}           //              +1 for x
          }
        };
      }
      `,
      options: [threshold],
    },
    {
      code: `
      function ok() {           // OK           +1 for ok
        a = true || false;      //              +1 for ok

        function* generator() { //              +1 for generator
        }
      }
      `,
      options: [threshold],
    },
    {
      code: `
      (function(x) {          // OK - Immediately Invoked Function Expression
        if (x) {}
        if (x) {}
        if (x) {}
      })(34);
      `,
      options: [threshold],
    },
    {
      code: `
      var a = function () {   // OK - Immediately Invoked Function Expression
        var a = true && false && true;
      }();
      `,
      options: [threshold],
    },
    {
      code: `
      new (function() {       // OK - Immediately Invoked Function Expression
        var a = true && false && true;
      })();
      `,
      options: [threshold],
    },
    {
      code: `
      define([], function(){  // AMD PATTERN - OK
        var a = true && false && true;
      });
      `,
      options: [threshold],
    },
    {
      code: `
      define([], "module name", function(){  // AMD PATTERN - OK
        var a = true && false && true;
      });
      `,
      options: [threshold],
    },
    // TODO not supported yet
    // {
    //   code: `
    //   // ANGULAR JS Exceptions

    //   var moduleX = angular.module("moduleX");

    //   moduleX
    //     .controller("Name", function() {   // OK
    //       var a = true && false && true;
    //     })
    //     .service("Name", ['$scope', function($scope) {   // OK
    //       var a = true && false && true;
    //     }]);

    //   moduleX.config(function() {   // OK
    //       var a = true && false && true;
    //   });
    //   `,
    //   options: [THRESHOLD],
    // },
  ],
  invalid: [
    {
      code: `
      function ko() {  // +1
             //^^
        if (x) {}      // +1
      //^^
        else if (y) {} // +1
           //^^
        else {}        // +0
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(2, 15, 2, 17),
          sndloc(4, 8, 4, 10),
          sndloc(6, 13, 6, 15),
        ]),
      ],
    },
    {
      code: `
      function ko() {  // +1
             //^^
        if (x) {}      // +1
      //^^
        else if (y) {} // +1
           //^^
        else if (z) {} // +1
           //^^
        else if (t) {} // +1
           //^^
      }
      `,
      options: [threshold],
      errors: [
        err(5, threshold, [
          sndloc(2, 15, 2, 17),
          sndloc(4, 8, 4, 10),
          sndloc(6, 13, 6, 15),
          sndloc(8, 13, 8, 15),
          sndloc(10, 13, 10, 15),
        ]),
      ],
    },
    {
      code: `
      function * ko() {  // +1
               //^^
        if (x) {}        // +1
      //^^
        else if (y) {}   // +1
           //^^
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(2, 17, 2, 19),
          sndloc(4, 8, 4, 10),
          sndloc(6, 13, 6, 15),
        ]),
      ],
    },
    {
      code: `
      function * ko() {  // +1
               //^^
        if (x) {         // +1
      //^^
          if (y) {}      // +1
        //^^
        }
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(2, 17, 2, 19),
          sndloc(4, 8, 4, 10),
          sndloc(6, 10, 6, 12),
        ]),
      ],
    },
    {
      code: `
      function ko(x) {    // +1
             //^^
        switch (x) {
          case 0:         // +1
        //^^^^
            break;
          case 1:         // +1
          //^^^^
            break;
          case 2:         // +1
          //^^^^
            break;
          default:        // +0
            break;
        }
      }
      `,
      options: [threshold],
      errors: [
        err(4, threshold, [
          sndloc(2, 15, 2, 17),
          sndloc(5, 10, 5, 14),
          sndloc(8, 10, 8, 14),
          sndloc(11, 10, 11, 14),
        ]),
      ],
    },
    {
      code: `
      function ko() {          // +1
             //^^
        a = true && false;     // +1
               //^^
        c = true || false;     // +1
               //^^
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(2, 15, 2, 17),
          sndloc(4, 17, 4, 19),
          sndloc(6, 17, 6, 19),
        ]),
      ],
    },
    {
      code: `
      function nesting() {     // OK            +1 for nesting
        function nested() {    // Noncompliant  +1 for nested
               //^^^^^^
          if (x) {             //               +1 for nested
        //^^
          } else if (y) {      //               +1 for nested
               //^^
          }
        }
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(3, 17, 3, 23),
          sndloc(5, 10, 5, 12),
          sndloc(7, 17, 7, 19),
        ]),
      ],
    },
    {
      code: `
      function nesting() {     // Noncompliant  +1 for nesting
             //^^^^^^^
        if (x) {               //               +1 for nesting
      //^^
        }

        function nested() {    // Noncompliant  +1 for nested
               //^^^^^^
          if (x) {             //               +1 for nested
        //^^
          } else if (y) {      //               +1 for nested
               //^^
          }
        }

        if (x) {               //               +1 for nesting
      //^^
        }
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(2, 15, 2, 22),
          sndloc(4, 8, 4, 10),
          sndloc(17, 8, 17, 10),
        ]),
        err(3, threshold, [
          sndloc(8, 17, 8, 23),
          sndloc(10, 10, 10, 12),
          sndloc(12, 17, 12, 19),
        ]),
      ],
    },
    {
      code: `
      function nesting1() {    // OK            +1 for nesting1
        function nesting2() {  // OK            +1 for nesting2
          function nested() {  // Noncompliant  +1 for nested
                 //^^^^^^
            if (x) {}          //               +1 for nested
          //^^
            else if (y) {}     //               +1 for nested
               //^^
          }
        }
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(4, 19, 4, 25),
          sndloc(6, 12, 6, 14),
          sndloc(8, 17, 8, 19),
        ]),
      ],
    },
    {
      code: `
      function nesting1() {    // OK            +1 for nesting1
        function nesting2() {  // Noncompliant  +1 for nesting2
               //^^^^^^^^
          a = true && false;   //               +1 for nesting2
                 //^^
          b = true && false;   //               +1 for nesting2
                 //^^
          function nested() {  // Noncompliant  +1 for nested
                 //^^^^^^
            if (x) {}          //               +1 for nested
          //^^
            else if (y) {}     //               +1 for nested
               //^^
          }
        }
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(3, 17, 3, 25),
          sndloc(5, 19, 5, 21),
          sndloc(7, 19, 7, 21),
        ]),
        err(3, threshold, [
          sndloc(9, 19, 9, 25),
          sndloc(11, 12, 11, 14),
          sndloc(13, 17, 13, 19),
        ]),
      ],
    },
    {
      code: `
      class C {
        ko() {            // Noncompliant // +1
      //^^
          if (x) {}       // +1
        //^^
          else if (y) {}  // +1
             //^^
        }
        ok() {            // +1
          if (x) {}       // +1
        }
        ko2() {           // Noncompliant // +1
      //^^
          if (x) {}       // +1
        //^^
          else if (y) {}  // +1
             //^^
        }
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(3, 8, 3, 10),
          sndloc(5, 10, 5, 12),
          sndloc(7, 15, 7, 17),
        ]),
        err(3, threshold, [
          sndloc(13, 8, 13, 11),
          sndloc(15, 10, 15, 12),
          sndloc(17, 15, 17, 17),
        ]),
      ],
    },
    {
      code: `
      class D {
        nesting() {             // OK            +1 for nesting
          function nested() {   // Noncompliant  +1 for nested
                 //^^^^^^
            while (x < y) {     //               +1 for nested
          //^^^^^
              return x || y     //               +1 for nested
                     //^^
            }
          }
        }
      }
      `,
      options: [threshold],
      errors: [
        err(3, threshold, [
          sndloc(4, 19, 4, 25),
          sndloc(6, 12, 6, 17),
          sndloc(8, 23, 8, 25),
        ]),
      ],
    },
    {
      code: `
      function ko() {          // OK           +1 for ko
        return {               //              +0 for ko
          get x() {            // Noncompliant +1 for x
            //^
            try {}             //              +0 for x
            catch(err) {}      //              +0 for x
            finally {}         //              +0 for x
            if (c) {}          //              +1 for x
          //^^
            else if (d) {}     //              +1 for x
               //^^
            if (c) {}          //              +1 for x
          //^^
          }
        };
      }
      `,
      options: [threshold],
      errors: [
        err(4, threshold, [
          sndloc(4, 14, 4, 15),
          sndloc(9, 12, 9, 14),
          sndloc(11, 17, 11, 19),
          sndloc(13, 12, 13, 14),
        ]),
      ],
    },
    {
      code: `
      function ok() {          // OK           +1 for ko
        if (a) {}              //              +1 for ko
        throw "error";         //              +0 for ko
        return {               //              +0 for ko
          get x() {            // Noncompliant +1 for x
            //^
            for (i=0; i<2; i++){}; //          +1 for x
          //^^^
            if (b) {}          //              +1 for x
          //^^
            if (c) {}          //              +1 for x
          //^^
          }
        };
      }
      `,
      options: [threshold],
      errors: [
        err(4, threshold, [
          sndloc(6, 14, 6, 15),
          sndloc(8, 12, 8, 15),
          sndloc(10, 12, 10, 14),
          sndloc(12, 12, 12, 14),
        ]),
      ],
    },
    {
      code: `
      export function toCreateModule() {}

        function complexFunction() { // +1
                //^^^^^^^^^^^^^^

          if (42) {}; // +1
        //^^
          while (42) {}; // +1
        //^^^^^
          do {} while (42); // +1
        //^^
          for (let x in {}) {} // +1
        //^^^
          for (let x of []) {} // +1
        //^^^
          for (;42;) {} // +1
        //^^^
          switch (21 * 3) {
            case 1: // +1
          //^^^^
            case 2: // +1
          //^^^^
            default:
          }
          1 && 2; // +1
          //^^
          1 || 2; // +1
          //^^
          1? 2 : 3; // +1
         //^


          // no complexity
          try {} catch (e) {}
          function bar(){}
          return 32;
      }
      `,
      options: [10],
      errors: [
        err(12, 10, [
          sndloc(4, 17, 4, 32),
          sndloc(7, 10, 7, 12),
          sndloc(9, 10, 9, 15),
          sndloc(11, 10, 11, 12),
          sndloc(13, 10, 13, 13),
          sndloc(15, 10, 15, 13),
          sndloc(17, 10, 17, 13),
          sndloc(20, 12, 20, 16),
          sndloc(22, 12, 22, 16),
          sndloc(26, 12, 26, 14),
          sndloc(28, 12, 28, 14),
          sndloc(30, 11, 30, 12),
        ]),
      ],
    },
  ],
});

function err(complexity: number, threshold: number, secondaryLocations: IssueLocation[]) {
  return {
    message: encode(complexity, threshold, secondaryLocations),
  };
}

function encode(
  complexity: number,
  threshold: number,
  secondaryLocations: IssueLocation[],
): string {
  const encodedMessage: EncodedMessage = {
    message: `Function has a complexity of ${complexity} which is greater than ${threshold} authorized.`,
    cost: complexity - threshold,
    secondaryLocations,
  };
  return JSON.stringify(encodedMessage);
}

function sndloc(line: number, column: number, endLine: number, endColumn: number): IssueLocation {
  return { line, column, endLine, endColumn, message: "+1" };
}
