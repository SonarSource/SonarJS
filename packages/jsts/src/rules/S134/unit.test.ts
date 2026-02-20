/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import type { EncodedMessage, IssueLocation } from '../helpers/index.js';
import { describe, it } from 'node:test';

const ruleTester = new DefaultParserRuleTester();

const THRESHOLD = 3;

const createOptions = (maximumNestingLevel: number) => {
  return [{ maximumNestingLevel }];
};

describe('S134', () => {
  it('S134', () => {
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
            options: createOptions(THRESHOLD),
            settings: { sonarRuntime: true },
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
            options: createOptions(4),
            settings: { sonarRuntime: true },
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
            options: createOptions(THRESHOLD),
            settings: { sonarRuntime: true },
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
  });
});

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

  return {
    code,
    errors: [error(primaryLocation!, secondaryLocations)],
    options: createOptions(threshold),
    settings: { sonarRuntime: true },
  };
}

function error(primaryLocation: IssueLocation, secondaryLocations: IssueLocation[]) {
  return {
    ...primaryLocation,
    message: encode(primaryLocation.message!, secondaryLocations),
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
