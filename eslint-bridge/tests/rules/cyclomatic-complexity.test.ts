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

const THRESHOLD = 2;

ruleTester.run("Functions should not be too complex", rule, {
  valid: [
    {
      code: `
      if (x) {}
      if (x) {}
      if (x) {}
      `,
      options: [THRESHOLD],
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
      options: [THRESHOLD],
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
      options: [THRESHOLD],
    },
    {
      code: `
      function ok() {          // OK            +1 for ok
        a = true && false;     //               +1 for ok
        b = arr.map(s => s.length);   // OK     +0 for ok
      }
      `,
      options: [THRESHOLD],
    },
    {
      code: `
      function ok() {          // OK            +1 for ok
        a = true && false;     //               +1 for ok
        b = () => 10;          // OK            +0 for ok
      }
      `,
      options: [THRESHOLD],
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
      options: [THRESHOLD],
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
      options: [THRESHOLD],
    },
    {
      code: `
      function ok() {           // OK           +1 for ok
        a = true || false;      //              +1 for ok

        function* generator() { //              +1 for generator
        }
      }
      `,
      options: [THRESHOLD],
    },
    {
      code: `
      (function(x) {          // OK - Immediately Invoked Function Expression
        if (x) {}
        if (x) {}
        if (x) {}
      })(34);
      `,
      options: [THRESHOLD],
    },
    {
      code: `
      var a = function () {   // OK - Immediately Invoked Function Expression
        var a = true && false && true;
      }();
      `,
      options: [THRESHOLD],
    },
    {
      code: `
      new (function() {       // OK - Immediately Invoked Function Expression
        var a = true && false && true;
      })();
      `,
      options: [THRESHOLD],
    },
    {
      code: `
      define([], function(){  // AMD PATTERN - OK
        var a = true && false && true;
      });
      `,
      options: [THRESHOLD],
    },
    {
      code: `
      define([], "module name", function(){  // AMD PATTERN - OK
        var a = true && false && true;
      });
      `,
      options: [THRESHOLD],
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
    invalid(`
    function ko() {  // Noncompliant +1 for ko
           //^^        [ko]
      if (x) {}      // +1 for ko
    //^^               [ko]
      else if (y) {} // +1 for ko
         //^^          [ko]
      else {}        // +0 for ko
    }
    `),
    invalid(`
    function ko() {  // Noncompliant +1 for ko
           //^^        [ko]
      if (x) {}      // +1 for ko
    //^^               [ko]
      else if (y) {} // +1 for ko
         //^^          [ko]
      else if (z) {} // +1 for ko
         //^^          [ko]
      else if (t) {} // +1 for ko
         //^^          [ko]
    }
    `),
    invalid(`
    function * ko() {  // Noncompliant +1 for ko
             //^^        [ko]
      if (x) {}        // +1 for ko
    //^^                 [ko]
      else if (y) {}   // +1 for ko
         //^^            [ko]
    }
    `),
    invalid(`
    function * ko() {  // Noncompliant +1 for ko
             //^^        [ko]
      if (x) {         // +1 for ko
    //^^                 [ko]
      if (y) {}        // +1 for ko
    //^^                 [ko]
      }
    }
    `),
    invalid(`
    function ko(x) {    // Noncompliant +1 for ko
           //^^           [ko]
      switch (x) {
        case 0:         // +1 for ko
      //^^^^              [ko]
          break;
        case 1:         // +1 for ko
      //^^^^              [ko]
          break;
        case 2:         // +1 for ko
      //^^^^              [ko]
          break;
        default:        // +0 for ko
          break;
      }
    }
    `),
    invalid(`
    function ko() {          // Noncompliant +1 for ko
           //^^                [ko]
      a = true && false;     // +1 for ko
             //^^              [ko]
      c = true || false;     // +1 for ko
             //^^              [ko]
    }
    `),
    invalid(`
    function nesting() {     // OK            +1 for nesting
      function nested() {    // Noncompliant  +1 for nested
             //^^^^^^          [nested]
        if (x) {             // +1 for nested
      //^^                     [nested]
        } else if (y) {      // +1 for nested
             //^^              [nested]
        }
      }
    }
    `),
    invalid(`
    function nesting() {     // Noncompliant  +1 for nesting
           //^^^^^^^           [nesting]
      if (x) {               //               +1 for nesting
    //^^                       [nesting]
      }

      function nested() {    // Noncompliant  +1 for nested
             //^^^^^^          [nested]
        if (x) {             // +1 for nested
      //^^                     [nested]
        } else if (y) {      // +1 for nested
             //^^              [nested]
        }
      }

      if (x) {               //               +1 for nesting
    //^^                       [nesting]
      }
    }
    `),
    invalid(`
    function nesting1() {    // OK            +1 for nesting1
      function nesting2() {  // OK            +1 for nesting2
        function nested() {  // Noncompliant  +1 for nested
               //^^^^^^        [nested]
          if (x) {}          //               +1 for nested
        //^^                   [nested]
          else if (y) {}     //               +1 for nested
             //^^              [nested]
        }
      }
    }
    `),
    invalid(`
    function nesting1() {    // OK            +1 for nesting1
      function nesting2() {  // Noncompliant  +1 for nesting2
             //^^^^^^^^        [nesting2]
        a = true && false;   //               +1 for nesting2
               //^^            [nesting2]
        b = true && false;   //               +1 for nesting2
               //^^            [nesting2]
        function nested() {  // Noncompliant  +1 for nested
               //^^^^^^        [nested]
          if (x) {}          //               +1 for nested
        //^^                   [nested]
          else if (y) {}     //               +1 for nested
             //^^              [nested]
        }
      }
    }
    `),
    invalid(`
    class C {
      ko() {            // Noncompliant +1 for ko
    //^^                  [ko]
        if (x) {}       // +1 for ko
      //^^                [ko]
        else if (y) {}  // +1 for ko
           //^^           [ko]
      }
      ok() {            // +1 for ok
        if (x) {}       // +1 for ok
      }
      ko2() {           // Noncompliant +1 for ko2
    //^^^                 [ko2]
        if (x) {}       // +1 for ko2
      //^^                [ko2]
        else if (y) {}  // +1 for ko2
           //^^           [ko2]
      }
    }
    `),
    invalid(`
    class D {
      nesting() {             // OK            +1 for nesting
        function nested() {   // Noncompliant  +1 for nested
               //^^^^^^         [nested]
          while (x < y) {     // +1 for nested
        //^^^^^                 [nested]
            return x || y     // +1 for nested
                   //^^         [nested]
          }
        }
      }
    }
    `),
    invalid(`
    function ko() {          // OK           +1 for ko
      return {               // +0 for ko
        get x() {            // Noncompliant +1 for x
          //^                  [x]
          try {}
          catch(err) {}
          finally {}
          if (c) {}          // +1 for x
        //^^                   [x]
          else if (d) {}     // +1 for x
             //^^              [x]
          if (c) {}          // +1 for x
        //^^                   [x]
        }
      };
    }
    `),
    invalid(`
    function ok() {               // OK           +1 for ko
      if (a) {}                   //              +1 for ko
      throw "error";              //
      return {                    //
        get x() {                 // Noncompliant +1 for x
          //^                       [x]
          for (i=0; i<2; i++){};  // +1 for x
        //^^^                       [x]
          if (b) {}               // +1 for x
        //^^                        [x]
          if (c) {}               // +1 for x
        //^^                        [x]
        }
      };
    }
    `),
    invalid(
      `
    export function toCreateModule() {}

    function complexFunction() {    // Noncompliant +1 for complexFunction
           //^^^^^^^^^^^^^^^          [complexFunction]

      if (42) {};                   // +1 for complexFunction
    //^^                              [complexFunction]
      while (42) {};                // +1 for complexFunction
    //^^^^^                           [complexFunction]
      do {} while (42);             // +1 for complexFunction
    //^^                              [complexFunction]
      for (let x in {}) {}          // +1 for complexFunction
    //^^^                             [complexFunction]
      for (let x of []) {}          // +1 for complexFunction
    //^^^                             [complexFunction]
      for (;42;) {}                 // +1 for complexFunction
    //^^^                             [complexFunction]
      switch (21 * 3) {
        case 1:                     // +1 for complexFunction
      //^^^^                          [complexFunction]
        case 2:                     // +1 for complexFunction
      //^^^^                          [complexFunction]
        default:
      }
      1 && 2;                       // +1 for complexFunction
      //^^                            [complexFunction]
      1 || 2;                       // +1 for complexFunction
      //^^                            [complexFunction]
      1 ? 2 : 3;                    // +1 for complexFunction
      //^                             [complexFunction]


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

function invalid(code: string, threshold = THRESHOLD) {
  const issues: Map<string, { complexity: number; locations: IssueLocation[] }> = new Map();
  const lines = code.split("\n");
  for (const [index, line] of lines.entries()) {
    let found: RegExpMatchArray | null;

    // // Noncompliant +1 for <function>
    const f = /\/\/\s*Noncompliant\s+\+1\s+for\s+([a-zA-Z0-9]+)\s*/;
    found = line.match(f);
    if (found) {
      const key = found[1];
      issues.set(key, { complexity: 1, locations: [] });
    }

    // // +1 for <function>
    const c = /\/\/\s*\+1\s+for\s+([a-zA-Z0-9]+)\s*/;
    found = line.match(c);
    if (found) {
      const key = found[1];
      const func = issues.get(key);
      if (func) {
        func.complexity += 1;
      }
    }

    // ^ ^^ ^^^ <function>
    const l = /(\^+\s+)+\[([a-zA-Z0-9]+)\]/;
    found = line.match(l);
    if (found) {
      const key = found[2];
      const matched = found[0];
      const markers = matched.split(" ");
      markers.pop();
      let column = line.indexOf(matched);
      for (const marker of markers) {
        if (marker.trim().length > 0) {
          const func = issues.get(key);
          if (func) {
            func.locations.push(location(index, column, index, column + marker.length));
          }
        }
        column += marker.length;
      }
    }
  }

  const errors = [];
  for (const issue of issues.values()) {
    errors.push(error(issue, threshold));
  }
  return { code, errors, options: [threshold] };
}

function error(issue: { complexity: number; locations: IssueLocation[] }, threshold: number) {
  return {
    message: encode(issue.complexity, threshold, issue.locations),
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

function location(line: number, column: number, endLine: number, endColumn: number): IssueLocation {
  return { line, column, endLine, endColumn, message: "+1" };
}
