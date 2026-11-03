/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import {
  NoTypeCheckingRuleTester,
  DefaultParserRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import type { EncodedMessage, IssueLocation } from '../helpers/location.js';
import { describe, it } from 'node:test';

describe('S1541', () => {
  it('S1541', () => {
    const ruleTester = new DefaultParserRuleTester();
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
      define("module name", [], function(){  // AMD PATTERN - OK
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
      b = true || false;
             //^^
      c = true ?? false;
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
  });
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

describe('S1541 function exclusions', () => {
  const body = 'if (a) {} if (b) {}';
  const functions = [`function () { ${body} }`, `() => { ${body} }`];
  const options = [{ threshold: 2 }];
  const report = (code: string) => ({
    code,
    options,
    errors: [{ message: /Function has a complexity of 3 which is greater than 2 authorized/ }],
  });

  for (const [name, tester] of [
    ['JavaScript', new DefaultParserRuleTester()],
    ['TypeScript', new NoTypeCheckingRuleTester()],
  ] as const) {
    it(`function exclusions in ${name}`, () => {
      tester.run(`function exclusions in ${name}`, rule, {
        valid: [
          ...functions.flatMap(fn => [
            `(${fn})()`,
            `(${fn})?.()`,
            `(async ${fn})()`,
            `(${fn})\`template\``,
            `(async ${fn})\`template\``,
            `(0, (1, ${fn}))()`,
          ]),
          `new (function () { ${body} })()`,
          `define(function () { ${body} })`,
          `define('module', function () { ${body} })`,
          `define([], function () { ${body} })`,
          `define('module', ['dependency'], function () { ${body} })`,
        ].map(code => ({ code, options })),
        invalid: [
          ...functions.flatMap(fn => [
            `const value = ${fn}`,
            `consume(${fn})`,
            `(${fn}, other)()`,
            `(condition ? ${fn} : other)()`,
            `(${fn}).call(null)`,
            `(${fn}).apply(null, [])`,
            `(${fn}).bind(null)`,
            `(${fn}).bind(null)()`,
            `(${fn})[method]()`,
          ]),
          `(function* () { ${body} })()`,
          `(async function* () { ${body} })()`,
          `(function* () { ${body} })\`template\``,
          `new (async function () { ${body} })()`,
          `new (() => { ${body} })()`,
          `define([], wrap(function () { ${body} }))`,
          `define([], function () { const helper = function () { ${body} }; })`,
          `function define() {} define([], function () { ${body} })`,
          `const define = other; define([], function () { ${body} })`,
          `define = customCallbackHandler; define([], function () { ${body} })`,
          `define([], function () { ${body} }); define = customCallbackHandler`,
          `function outer(define) { define([], function () { ${body} }) }`,
          `import define from 'other'; define([], function () { ${body} })`,
          `object.define([], function () { ${body} })`,
          `define([], 'module', function () { ${body} })`,
          `define(dependencies, function () { ${body} })`,
          `define([dependency], function () { ${body} })`,
          `define([...dependencies], function () { ${body} })`,
          `define([,], function () { ${body} })`,
          `define([], function () { ${body} }, extra)`,
          `define([], function* () { ${body} })`,
          `define(() => { ${body} })`,
          `define('module', () => { ${body} })`,
          `define([], () => { ${body} })`,
          `define('module', ['dependency'], () => { ${body} })`,
          `define([], async () => { ${body} })`,
        ].map(report),
      });
    });
  }

  it('TypeScript function wrappers', () => {
    new NoTypeCheckingRuleTester().run('TypeScript function wrappers', rule, {
      valid: functions
        .flatMap(fn => [
          `((${fn}) as unknown as Function)()`,
          `((${fn}) satisfies Function)()`,
          `(${fn})!()`,
          `(<Function>(${fn}))()`,
          `((0, ((${fn}) as Function)) satisfies Function)()`,
          `((${fn}) as Function)\`template\``,
        ])
        .concat([
          `define('module' as string, [] satisfies string[], (function () { ${body} }) as Function)`,
          `define([], (function<T>() { ${body} })<number>)`,
          `define(['dep' as string], function () { ${body} })`,
          `define(['dep' satisfies string, 'other'!, <string>'last'], function () { ${body} })`,
          `((function<T>() { ${body} })<number>)()`,
          `((<T,>() => { ${body} })<number>)()`,
          `((function<T>() { ${body} })<number>)?.()`,
          `((async function<T>() { ${body} })<number>)()`,
          `((async <T,>() => { ${body} })<number>)()`,
          `((function<T>() { ${body} })<number>)\`template\``,
          `((<T,>() => { ${body} })<number>)\`template\``,
          `new ((function<T>() { ${body} })<number>)()`,
          `((0, ((<T,>() => { ${body} })<number>)) as Function)()`,
        ])
        .map(code => ({ code, options, filename: 'file.ts' })),
      invalid: [
        `((function* () { ${body} }) as Function)()`,
        `((() => { ${body} }) as Function).call(null)`,
        `define(dependencies as string[], (function () { ${body} }) as Function)`,
        `declare function define(...args: any[]): void; define([], function () { ${body} })`,
        `define([], (() => { ${body} }) as Function)`,
        `define([], (<T,>() => { ${body} })<number>)`,
        `define([dependency as string], function () { ${body} })`,
        `define([...dependencies as string[]], function () { ${body} })`,
        `define([, 'dep' as string], function () { ${body} })`,
        `define([], (function*<T>() { ${body} })<number>)`,
        `define([], (0, (function<T>() { ${body} })<number>))`,
        `define([], wrap((function<T>() { ${body} })<number>))`,
        `const value = (function<T>() { ${body} })<number>`,
        `consume((<T,>() => { ${body} })<number>)`,
        `((function*<T>() { ${body} })<number>)()`,
        `((async function*<T>() { ${body} })<number>)()`,
        `((function*<T>() { ${body} })<number>)\`template\``,
        `new ((async function<T>() { ${body} })<number>)()`,
        `new ((<T,>() => { ${body} })<number>)()`,
        `((<T,>() => { ${body} })<number>).call(null)`,
      ].map(report),
    });
  });
});

describe('S1541 loader scope initializers', () => {
  const body = 'if (a) {} if (b) {}';
  const factory = `function () { ${body} function nested() { ${body} } }`;
  const callback = `function () { ${body} }`;
  const options = [{ threshold: 2 }];
  const message = /Function has a complexity of 3 which is greater than 2 authorized/;
  const calls = [
    `sap.ui.define([], ${factory})`,
    `sap.ui.define('module', ['dep'], ${factory}, false)`,
    `require(['dep'], ${factory})`,
    `sap.ui.require([], ${factory})`,
    `System.register([], ${factory})`,
    `System.register(['dep'], ${factory}, [{}])`,
  ];
  const retained = (code: string, count = 2) => ({
    code,
    options,
    errors: Array.from({ length: count }, () => ({ message })),
  });
  for (const [name, tester] of [
    ['JavaScript', new DefaultParserRuleTester()],
    ['TypeScript', new NoTypeCheckingRuleTester()],
  ] as const) {
    it(`loader scope initializers in ${name}`, () => {
      tester.run(`loader scope initializers in ${name}`, rule, {
        valid: [],
        invalid: [
          ...calls.map(code => ({
            code,
            options,
            errors: [{ message, column: code.indexOf('nested') + 1 }],
          })),
          retained(`require([], ${factory}, ${callback})`),
          retained(`sap.ui.require([], ${factory}, ${callback})`),
          ...['require', 'sap.ui.require'].flatMap(loader =>
            [
              `() => { ${body} }`,
              `async () => { ${body} }`,
              `async ${callback}`,
              `function* () { ${body} }`,
              `async function* () { ${body} }`,
            ].map(errback => retained(`${loader}([], ${factory}, ${errback})`)),
          ),
          retained(
            `System.register([], function () { ${body} return { setters: [${callback}], execute: ${callback} }; })`,
          ),
          ...[
            `sap.ui.define([], ${callback})`,
            `require([], ${callback})`,
            `sap.ui.require([], ${callback})`,
            `System.register([], ${callback})`,
          ].map(code => retained(code, 1)),
          ...[
            `sap['ui'].define([], ${factory})`,
            `sap.ui['define']([], ${factory})`,
            `sap.ui.define?.([], ${factory})`,
            `sap.ui?.define([], ${factory})`,
            `require?.([], ${factory})`,
            `System['register']([], ${factory})`,
            `System.register?.([], ${factory})`,
            `sap.ui.define(${factory})`,
            `sap.ui.define([], ${factory}, flag)`,
            `sap.ui.define(name, [], ${factory})`,
            `require('dep', ${factory})`,
            `require([dep], ${factory})`,
            `require([,], ${factory})`,
            `require([...deps], ${factory})`,
            `require([], ${factory}, extra, extra)`,
            `require([], (0, ${factory}))`,
            `const callback = ${factory}; require([], callback)`,
            `System.register('name', [], ${factory})`,
            `System.register([], ${factory}, metadata)`,
            `System.register([], ${factory}, [extra])`,
            `System.register([], ${factory}, [,])`,
            `System.register([], ${factory}, [...metadata])`,
            `function scope(sap) { sap.ui.define([], ${factory}); }`,
            `const require = other; require([], ${factory})`,
            `function scope(System) { System.register([], ${factory}); }`,
            ...['async function', 'function*', 'async function*'].map(
              kind => `require([], ${factory.replace('function ()', `${kind} ()`)})`,
            ),
            `require([], () => { ${body} function nested() { ${body} } })`,
          ].map(code => retained(code)),
          ...calls.flatMap(code => {
            const root = code.startsWith('sap')
              ? 'sap'
              : code.startsWith('System')
                ? 'System'
                : 'require';
            const path = code.slice(0, code.indexOf('('));
            return [
              `${root} = other; ${code}`,
              `${code}; ${root} = other`,
              `function replaceLoader() { ${root} = other; } ${code}`,
              `function replaceMethod() { ${path} = other; } ${code}`,
              `${path} = other; ${code}`,
              `${path} ||= other; ${code}`,
              `${path}++; ${code}`,
              ...(root === 'require' ? [] : [`delete ${path}; ${code}`]),
              `({ x: ${path} } = other); ${code}`,
              `([${path}] = other); ${code}`,
              `({ x: ${path} = other } = source); ${code}`,
              `for ({ x: ${path} } of items) {} ${code}`,
              `for (${path} of items) {} ${code}`,
              `for (${path} in items) {} ${code}`,
              ...(root === 'sap'
                ? [
                    `sap.ui = other; ${code}`,
                    `sap[key] = other; ${code}`,
                    `sap.ui[key] = other; ${code}`,
                    `sap.ui[\`un\${key}\`] = other; ${code}`,
                  ]
                : []),
              ...(root === 'System'
                ? [`System[key] = other; ${code}`, `System['register'] = other; ${code}`]
                : []),
            ].map(value => retained(value));
          }),
          ...[
            `delete sap?.ui.define; ${calls[0]}`,
            `delete (sap?.ui).require; ${calls[3]}`,
            `delete System?.register; ${calls[4]}`,
            `sap.ui[\`define\`] = other; ${calls[0]}`,
            `System[\`register\`] = other; ${calls[4]}`,
          ].map(code => retained(code)),
          ...(name === 'TypeScript'
            ? [retained(`delete (sap?.ui.define as any); ${calls[0]}`)]
            : []),
          ...calls.flatMap(code => {
            const root = code.startsWith('sap')
              ? 'sap'
              : code.startsWith('System')
                ? 'System'
                : 'require';
            return [
              `unrelated.value = other; ${code}`,
              `${root}.unrelated = other; ${code}`,
              ...(root === 'sap' || root === 'System'
                ? [`${root}[\`unrelated\`] = other; ${code}`, `${root}[42] = other; ${code}`]
                : []),
              ...(root === 'sap'
                ? [`sap.ui[\`unrelated\`] = other; ${code}`, `sap.ui[42] = other; ${code}`]
                : []),
              `function local(${root}) { ${root} = other; } ${code}`,
            ].map(value => ({
              code: value,
              options,
              errors: [{ message, column: value.indexOf('nested') + 1 }],
            }));
          }),
        ],
      });
    });
  }
  it('TypeScript loader values', () => {
    new NoTypeCheckingRuleTester().run('TypeScript loader values', rule, {
      valid: [],
      invalid: [
        `sap.ui.define('module' as string, ['dep' satisfies string] as string[], (${factory}) as Function, false as boolean)`,
        `require([] satisfies string[], (${factory})!)`,
        `sap.ui.require([], (${factory.replace('function ()', 'function<T> ()')})<number>)`,
        `System.register([] as string[], (${factory}) satisfies Function, [] as object[])`,
      ].map(code => ({
        code,
        options,
        filename: 'file.ts',
        errors: [{ message, column: code.indexOf('nested') + 1 }],
      })),
      ...[
        `(sap.ui as any).define = other; sap.ui.define([], ${factory})`,
        `(sap as any).ui.require = other; sap.ui.require([], ${factory})`,
        `(System.register as Function) = other; System.register([], ${factory})`,
        `(require as Function) = other; require([], ${factory})`,
      ].map(code => ({ ...retained(code), filename: 'file.ts' })),
    });
  });
});
