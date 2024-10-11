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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { EncodedMessage, IssueLocation } from '../helpers/index.js';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const options = [
  {
    max: 3,
  },
];

ruleTester.run('Expressions should not be too complex', rule, {
  valid: [
    {
      code: `let b = 1 || 2 || 3 || 4`,
      options,
    },
    {
      code: `let b = 1 && 2 && 4 && 4`,
      options,
    },
    {
      code: `let b = 1 ? ( 2 ? ( 3 ? true : false ) : false ) : false;`,
      options,
    },
    {
      code: `let b = foo(1 || 2 || 3, 1 || 2 || 3);`,
      options,
    },
    {
      code: `let b = 1 || 2 || 3 || foo(1 || 2);`,
      options,
    },
    {
      code: `let b = {x: 1 || 2 || 3, y: 1 || 2 || 3};`,
      options,
    },
    {
      code: `let b = 1 || 2 || 3 || {x: 1 || 2};`,
      options,
    },
    {
      code: `let b = function () {1 || 2 || 3 || 4};`,
      options,
    },
    {
      code: `let b = 1 || 2 || 3 || function () {1 || 2};`,
      options,
    },
    {
      code: `let b = 1 || 2 || 3 || function () {1 || 2 || function () {1 || 2}};`,
      options,
    },
    {
      code: `let b = 1 || 2 || 3 || function f() {1 || 2 || function g() {1 || 2}};`,
      options,
    },
    {
      code: `let b = <div>{1 || 2 || 3 || 4}</div>;`,
      options,
    },
    {
      code: `let b = 1 || 2 || 3 || <div>{1 || 2}</div>;`,
      options,
    },
    {
      code: `let b = 1 || 2 || 3 || 4 || 5 || 6 || 7 || 8 || 9 || 10;`,
      options: [
        {
          max: 10,
        },
      ],
    },
  ],
  invalid: [
    invalid(`
    let b = 1 || 2 || 3 || 4 || 5;
          //--^^---^^---^^---^^--
    `),
    invalid(`
    let b = 1 && 2 && 3 && 4 && 5;
          //--^^---^^---^^---^^--
    `),
    invalid(`
    function f() {
      let b = 1 || 2 || 3 || 4 || 5;
            //--^^---^^---^^---^^--
    }
    `),
    invalid(`
    function f() {
      let b = 1 || 2 || 3 ||
      function g() {
        let b = 1 || 2 || 3 || 4 || 5;
              //--^^---^^---^^---^^--
      }
    }
    `),
    invalid(`
    function f() {
      let b = 1 || 2 || 3 ||
      function g() {
        let b = 1 || 2 || 3 ||
        function h() {
          let b = 1 || 2 || 3 || 4 || 5;
                //--^^---^^---^^---^^--
        }
      }
    }
    `),
    invalid(
      `
    let b = 1 ? true : false;
          //--^-------------
    `,
      0,
    ),
  ],
});

function invalid(code: string, max = 3) {
  const issue = {
    complexity: 0,
    primaryLocation: {} as IssueLocation,
    secondaryLocations: [] as IssueLocation[],
  };
  const lines = code.split('\n');
  for (const [index, line] of lines.entries()) {
    let found: RegExpMatchArray | null;

    const regex = /\/\/\s*([-\^]+)/;
    found = line.match(regex);
    if (found) {
      let marker = found[1];
      const column = line.indexOf(marker);
      issue.primaryLocation = location(index, column, index, column + marker.length);

      marker += ' ';
      let secondaryStart = -1;
      for (let i = 0; i < marker.length; ++i) {
        if (marker[i] === '^') {
          if (secondaryStart === -1) {
            secondaryStart = i;
          }
        } else {
          if (secondaryStart !== -1) {
            issue.complexity += 1;
            issue.secondaryLocations.push(
              location(index, column + secondaryStart, index, column + i, '+1'),
            );
            secondaryStart = -1;
          }
        }
      }
    }
  }
  issue.secondaryLocations.sort((a, b) => b.column - a.column);
  return {
    code,
    errors: [error(issue, max)],
    options: [
      {
        max,
      },
      'sonar-runtime',
    ],
  };
}

function error(
  issue: {
    complexity: number;
    primaryLocation: IssueLocation;
    secondaryLocations: IssueLocation[];
  },
  max: number,
) {
  const { line, column, endColumn, endLine } = issue.primaryLocation;
  return {
    message: encode(issue.complexity, max, issue.secondaryLocations),
    line,
    column: column + 1,
    endColumn: endColumn + 1,
    endLine,
  };
}

function encode(complexity: number, max: number, secondaryLocations: IssueLocation[]): string {
  const encodedMessage: EncodedMessage = {
    message: `Reduce the number of conditional operators (${complexity}) used in the expression (maximum allowed ${max}).`,
    secondaryLocations,
    cost: complexity - max,
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
  return { message, column, line, endColumn, endLine };
}
