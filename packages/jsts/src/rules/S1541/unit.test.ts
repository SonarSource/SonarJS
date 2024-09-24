/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { RuleTester } from 'eslint';
import { rule } from './/index.ts';
import { EncodedMessage, IssueLocation } from '../helpers/index.ts';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
const options = [
  {
    threshold: 2,
  },
];

ruleTester.run('Functions should not be too complex', rule, {
  valid: [
    {
      code: `
      if (x) {}
      if (x) {}
      if (x) {}
      `,
      options,
    },
    {
      code: `
      function ok() {  // +1
        if (x) {       // +1
          return 0;    // +0
        } else {       // +0
          return 1;    // +0
        }
      }
      `,
      options,
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
      options,
    },
    {
      code: `
      function ok() {          // OK            +1 for ok
        a = true && false;     //               +1 for ok
        b = arr.map(s => s.length);   // OK     +0 for ok
      }
      `,
      options,
    },
    {
      code: `
      function ok() {          // OK            +1 for ok
        a = true && false;     //               +1 for ok
        b = () => 10;          // OK            +0 for ok
      }
      `,
      options,
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
      options,
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
      options,
    },
    {
      code: `
      function ok() {           // OK           +1 for ok
        a = true || false;      //              +1 for ok

        function* generator() { //              +1 for generator
        }
      }
      `,
      options,
    },
    {
      code: `
      (function(x) {          // OK - Immediately Invoked Function Expression
        if (x) {}
        if (x) {}
        if (x) {}
      })(34);
      `,
      options,
    },
    {
      code: `
      var a = function () {   // OK - Immediately Invoked Function Expression
        var a = true && false && true;
      }();
      `,
      options,
    },
    {
      code: `
      new (function() {       // OK - Immediately Invoked Function Expression
        var a = true && false && true;
      })();
      `,
      options,
    },
    {
      code: `
      define([], function(){  // AMD PATTERN - OK
        var a = true && false && true;
      });
      `,
      options,
    },
    {
      code: `
      define([], "module name", function(){  // AMD PATTERN - OK
        var a = true && false && true;
      });
      `,
      options,
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
    //   options,
    // },
  ],
  invalid: [
    invalid(`
    function ko() {
          //P^^
      if (x) {}
    //^^
      else if (y) {}
         //^^
      else {}
    }
    `),
    invalid(`
    function ko() {
          //P^^
      if (x) {}
    //^^
      else if (y) {}
         //^^
      else if (z) {}
         //^^
      else if (t) {}
         //^^
    }
    `),
    invalid(`
    function * ko() {
            //P^^
      if (x) {}
    //^^
      else if (y) {}
         //^^
    }
    `),
    invalid(`
    function * ko() {
            //P^^ 
      if (x) {
    //^^
      if (y) {}
    //^^
      }
    }
    `),
    invalid(`
    function ko(x) {
          //P^^
      switch (x) {
        case 0:
      //^^^^
          break;
        case 1:
      //^^^^
          break;
        case 2:
      //^^^^
          break;
        default:
          break;
      }
    }
    `),
    invalid(`
    function ko() {
          //P^^
      a = true && false;
             //^^
      c = true || false;
             //^^
    }
    `),
    invalid(`
    function nesting() {
      function nested() {
            //P^^^^^^
        if (x) {
      //^^
        } else if (y) {
             //^^
        }
      }
    }
    `),
    invalid(`
    function nesting1() {
      function nesting2() {
        function nested() {
              //P^^^^^^
          if (x) {}
        //^^
          else if (y) {}
             //^^
        }
      }
    }
    `),
    invalid(`
    class C {
      ko() {
   //P^^
        if (x) {}
      //^^
        else if (y) {}
           //^^
      }
      ok() {
        if (x) {}
      }
    }
    `),
    invalid(`
    class D {
      nesting() {
        function nested() {
              //P^^^^^^
          while (x < y) {
        //^^^^^
            return x || y;
                   //^^
          }
        }
      }
    }
    `),
    invalid(`
    function ko() {
      return {
        get x() {
         //P^
          try {}
          catch(err) {}
          finally {}
          if (c) {}
        //^^
          else if (d) {}
             //^^
          if (c) {}
        //^^
        }
      };
    }
    `),
    invalid(`
    function ok() {
      if (a) {}
      throw "error";
      return {
        get x() {
         //P^
          for (i=0; i<2; i++){};
        //^^^
          if (b) {}
        //^^
          if (c) {}
        //^^
        }
      };
    }
    `),
    invalid(
      `
    export function toCreateModule() {}

    function complexFunction() {
  //P        ^^^^^^^^^^^^^^^ 
      if (42) {};
    //^^
      while (42) {};
    //^^^^^
      do {} while (42);
    //^^
      for (let x in {}) {}
    //^^^
      for (let x of []) {}
    //^^^
      for (;42;) {}
    //^^^
      switch (21 * 3) {
        case 1:
      //^^^^
        case 2:
      //^^^^
        default:
      }
      1 && 2;
      //^^
      1 || 2;
      //^^
      1 ? 2 : 3;
      //^

      // no complexity
      try {} catch (e) {}
      function bar(){}
      return 32;
    }
    `,
      10,
    ),
  ],
});

function invalid(code: string, threshold = 2) {
  const issue = {
    complexity: 0,
    primaryLocation: {} as IssueLocation,
    secondaryLocations: [] as IssueLocation[],
  };
  const lines = code.split('\n');
  for (const [index, line] of lines.entries()) {
    let found: RegExpMatchArray | null;

    const primary = /\/\/P\s*(\^+)/;
    found = line.match(primary);
    if (found) {
      const marker = found[1];
      const column = line.indexOf(marker);
      issue.primaryLocation = location(index, column, index, column + marker.length);
    }

    const secondary = /\/\/\s*[^\^]*(\^+)/;
    found = line.match(secondary);
    if (found) {
      const marker = found[1];
      const column = line.indexOf(marker);
      issue.complexity += 1;
      issue.secondaryLocations.push(location(index, column, index, column + marker.length, '+1'));
    }
  }

  return {
    code,
    errors: [error(issue, threshold)],
    options: [
      {
        threshold,
      },
    ],
  };
}

function error(
  issue: {
    complexity: number;
    primaryLocation: IssueLocation;
    secondaryLocations: IssueLocation[];
  },
  threshold: number,
) {
  const { line, column, endLine, endColumn } = issue.primaryLocation;
  return {
    message: encode(issue.complexity, threshold, issue.secondaryLocations),
    line,
    column: column + 1,
    endColumn: endColumn + 1,
    endLine,
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

function location(
  line: number,
  column: number,
  endLine: number,
  endColumn: number,
  message?: string,
): IssueLocation {
  return { line, column, endLine, endColumn, message };
}
