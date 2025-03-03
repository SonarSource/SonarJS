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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S5659', () => {
  it('S5659', () => {
    const ruleTesterJs = new RuleTester();
    const ruleTesterTs = new RuleTester();

    const testCases = {
      valid: [
        {
          code: `
      const jwt = require('jsonwebtoken');
      let token = jwt.sign({ foo: 'bar' }, key, { algorithm: 'RS256' });   
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      let token = jwt.sign({ foo: 'bar' }, key, { algorithm: 'HS256' });   
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      let token = jwt.sign({ foo: 'bar' }, key, { expiresIn: '30d' });   
            `,
        },
        {
          code: `
      const jwt = unknown('jsonwebtoken');
      let token = jwt.sign({ foo: 'bar' }, key, { algorithm: 'none' });   
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      let NONE = 'none';
      if (x) {
        NONE = 'other';
      }
      jwt.sign(forgedtoken, key, { expiresIn: 360000 * 5, algorithm: NONE }, callbackcheck);
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      let token = jwt.sign('missing arguments');   
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      let options = { algorithm: 'RS256' };
      if (x) {
        options = { algorithm: 'none' };
      }
      let token = jwt.sign({ foo: 'bar' }, key, options);   
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      jwt.verify(forgedtoken, key, { expiresIn: 360000 * 5, algorithms: ['RS256', 'HS256'] }, callbackcheck);
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      let NONE = 'none';
      if (x) {
        NONE = 'other';
      }
      jwt.verify(forgedtoken, key, { expiresIn: 360000 * 5, algorithms: ['RS256', NONE] }, callbackcheck);
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      const algorithms = 'other';
      if (x) {
        algorithms = ['RS256', 'none'];
      }
      jwt.verify(forgedtoken, key, { expiresIn: 360000 * 5, algorithms }, callbackcheck);
            `,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      jwt.verify(forgedtoken, key, { expiresIn: 360000 * 5 }, callbackcheck);`,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      const options = { expiresIn: 360000 * 5 };
      jwt.verify(forgedtoken, key, options, callbackcheck);`,
        },
      ],
      invalid: [
        {
          code: `
      const jwt = require('jsonwebtoken');
      let token = jwt.sign({ foo: 'bar' }, key, { algorithm: 'none' });   
            `,
          errors: [
            {
              message: JSON.stringify({
                message: 'Use only strong cipher algorithms when signing this JWT.',
                secondaryLocations: [
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 48,
                    line: 3,
                    endColumn: 69,
                    endLine: 3,
                  },
                ],
              }),
              line: 3,
              endLine: 3,
              column: 19,
              endColumn: 27,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      const options = { algorithm: 'none' };
      let token = jwt.sign({ foo: 'bar' }, key, options);   
            `,
          errors: [
            {
              message: JSON.stringify({
                message: 'Use only strong cipher algorithms when signing this JWT.',
                secondaryLocations: [
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 22,
                    line: 3,
                    endColumn: 43,
                    endLine: 3,
                  },
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 48,
                    line: 4,
                    endColumn: 55,
                    endLine: 4,
                  },
                ],
              }),
              line: 4,
              endLine: 4,
              column: 19,
              endColumn: 27,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      const NONE = 'none';
      let token = jwt.sign({ foo: 'bar' }, key, { algorithm: NONE });   
            `,
          errors: [
            {
              message: JSON.stringify({
                message: 'Use only strong cipher algorithms when signing this JWT.',
                secondaryLocations: [
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 48,
                    line: 4,
                    endColumn: 67,
                    endLine: 4,
                  },
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 19,
                    line: 3,
                    endColumn: 25,
                    endLine: 3,
                  },
                ],
              }),
              line: 4,
              endLine: 4,
              column: 19,
              endColumn: 27,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      const NONE = 'none';
      const options = { algorithm: NONE };
      let token = jwt.sign({ foo: 'bar' }, key, options);   
            `,
          errors: [
            {
              message: JSON.stringify({
                message: 'Use only strong cipher algorithms when signing this JWT.',
                secondaryLocations: [
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 22,
                    line: 4,
                    endColumn: 41,
                    endLine: 4,
                  },
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 48,
                    line: 5,
                    endColumn: 55,
                    endLine: 5,
                  },
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 19,
                    line: 3,
                    endColumn: 25,
                    endLine: 3,
                  },
                ],
              }),
              line: 5,
              endLine: 5,
              column: 19,
              endColumn: 27,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      let token = require('jsonwebtoken').sign({ foo: 'bar' }, key, { algorithm: 'none' });   
            `,
          errors: [
            {
              message: JSON.stringify({
                message: 'Use only strong cipher algorithms when signing this JWT.',
                secondaryLocations: [
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 68,
                    line: 2,
                    endColumn: 89,
                    endLine: 2,
                  },
                ],
              }),
              line: 2,
              endLine: 2,
              column: 19,
              endColumn: 47,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      jwt.verify(forgedtoken, key, { expiresIn: 360000 * 5, algorithms: ['RS256', 'none'] }, callbackcheck);
            `,
          errors: 1,
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      const algorithms = ['RS256', 'none'];
      jwt.verify(forgedtoken, key, { expiresIn: 360000 * 5, algorithms }, callbackcheck);
            `,
          errors: [
            {
              message: JSON.stringify({
                message:
                  'Use only strong cipher algorithms when verifying the signature of this JWT.',
                secondaryLocations: [
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 35,
                    line: 4,
                    endColumn: 72,
                    endLine: 4,
                  },
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 25,
                    line: 3,
                    endColumn: 42,
                    endLine: 3,
                  },
                ],
              }),
              line: 4,
              endLine: 4,
              column: 7,
              endColumn: 17,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      const NONE = 'none';
      jwt.verify(forgedtoken, key, { expiresIn: 360000 * 5, algorithms: ['RS256', NONE] }, callbackcheck);
            `,
          errors: [
            {
              message: JSON.stringify({
                message:
                  'Use only strong cipher algorithms when verifying the signature of this JWT.',
                secondaryLocations: [
                  {
                    message: `The "algorithms" option should be defined and should not contain 'none'.`,
                    column: 35,
                    line: 4,
                    endColumn: 89,
                    endLine: 4,
                  },
                ],
              }),
              line: 4,
              endLine: 4,
              column: 7,
              endColumn: 17,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `
      const jwt = require('jsonwebtoken');
      jwt.verify(forgedtoken, null, { expiresIn: 360000 * 500 }, callbackcheck);`,
          errors: 1,
        },
      ],
    };

    ruleTesterJs.run(
      '[JS] JWT should be signed and verified with strong cipher algorithms',
      rule,
      testCases,
    );
    ruleTesterTs.run(
      '[TS] JWT should be signed and verified with strong cipher algorithms',
      rule,
      testCases,
    );
  });
});
