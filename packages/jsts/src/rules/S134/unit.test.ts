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
import { rule } from './';
import { IssueLocation, EncodedMessage } from 'eslint-plugin-sonarjs/lib/utils/locations';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

const THRESHOLD = 3;

ruleTester.run(
  'Refactor this code to not nest more than X if/for/while/switch/try statements.',
  rule,
  {
    valid: [
      {
        code: `
      if (true) {
        if (true) {
          for (const i of arr) {
          }
        }
      }
    `,
        options: [THRESHOLD],
      },
      {
        code: `
      if (true) {
        if (true) {
          for (const i of arr) {
            while (true) {
            }
          }
        }
      }
    `,
        options: [4],
      },
      {
        code: `
          if (true) {
          } else if (false) {
            while (true) {
              if (true) {
              }
            }
          }
        `,
        options: [THRESHOLD],
      },
    ],
    invalid: [
      invalid(
        `
        if (true) {
//      ^^         
          if (true) {
//        ^^            
              if (true) {
//------------^^---       
              }
          }
        }`,
        2,
      ),
      invalid(
        `
        if (true) {

        } else if (true) {
//             ^^                 
          if (true) {
//        ^^            
              if (true) {
//------------^^---       
              }
          }
        }`,
        2,
      ),
      invalid(
        `
       for (var i = 0; i < 0; i++) { // level 1
//     ^^^
          for (bar in MyArray) {     // level 2
//        ^^^
            while (false) {               // level 3
//----------^^^^^---
              }}}`,
        2,
      ),
    ],
  },
);

function invalid(code: string, threshold = THRESHOLD) {
  let primaryLocation: IssueLocation;
  const secondaryLocations: IssueLocation[] = [];
  const lines = code.split('\n');
  for (const [index, line] of lines.entries()) {
    let found: RegExpMatchArray | null;

    const primary = /\/\/\s*\-+(\^+)\-+/;
    found = line.match(primary);
    if (found) {
      const marker = found[1];
      const column = line.indexOf(marker) + 1; // Column is one-based in tests
      const msg = `Refactor this code to not nest more than ${threshold} if/for/while/switch/try statements.`;
      primaryLocation = location(index, column, index, column + marker.length, msg);
    }

    const secondary = /\/\/\s*(\^+)/;
    found = line.match(secondary);
    if (found) {
      const marker = found[1];
      const column = line.indexOf(marker);
      secondaryLocations.push(location(index, column, index, column + marker.length, '+1'));
    }
  }

  return { code, errors: [error(primaryLocation, secondaryLocations)], options: [threshold] };
}

function error(primaryLocation: IssueLocation, secondaryLocations: IssueLocation[]) {
  return {
    ...primaryLocation,
    message: encode(primaryLocation.message, secondaryLocations),
  };
}

function encode(message: string, secondaryLocations: IssueLocation[]): string {
  const encodedMessage: EncodedMessage = {
    message,
    secondaryLocations,
  };
  return JSON.stringify(encodedMessage);
}

function location(
  line: number,
  column: number,
  endLine: number,
  endColumn: number,
  message: string,
): IssueLocation {
  return { message, column, line, endColumn, endLine };
}
