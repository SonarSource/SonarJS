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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run('Allowing confidential information to be logged is security-sensitive', rule, {
  valid: [
    {
      code: `
      const { Signale } = require('signale');
      const options = {
        secrets: ["([0-9]{4}-?)+"]
      };
      const logger = new Signale(options); // Compliant
            `,
    },
    {
      code: `
      const signale = require('signale');
      const options = {
        secrets: []
      };
      const logger = new signale.Other(options);
            `,
    },
    {
      code: `
      const { Signale } = require('signale');
      let options = {
        secrets: []
      };
      if (x) {
        options = getOptions();
      }
      const logger = new Signale(options);
            `,
    },
    {
      code: `
      const { Signale } = require('signale');
      let options = {
        secrets: getSecrets()
      };
      const logger = new Signale(options);
            `,
    },
    {
      code: `
      const signale = require('signale');
      let secretsArray = [];
      if (x) {
        secretsArray[0] = "([0-9]{4}-?)+";
      }
      const options = {
        secrets: secretsArray
      };
      const logger = new signale.Signale(options);
            `,
    },
  ],
  invalid: [
    {
      code: `
      const signale = require('signale');
      const options = {
        secrets: []
      };
      const logger = new signale.Signale(options); // Sensitive
            `,
      errors: [
        {
          line: 6,
          endLine: 6,
          column: 26,
          endColumn: 41,
          message: JSON.stringify({
            message: 'Make sure confidential information is not logged here.',
            secondaryLocations: [{ column: 8, line: 4, endColumn: 19, endLine: 4 }],
          }),
        },
      ],
    },
    {
      code: `
      const { Signale } = require('signale');
      const options = {
        secrets: []
      };
      const logger = new Signale(options); // Sensitive
            `,
      errors: [
        {
          line: 6,
          endLine: 6,
          column: 26,
          endColumn: 33,
          message: JSON.stringify({
            message: 'Make sure confidential information is not logged here.',
            secondaryLocations: [{ column: 8, line: 4, endColumn: 19, endLine: 4 }],
          }),
        },
      ],
    },
    {
      code: `
      const { Signale } = require('signale');
      const options = {
        other: []
      };
      const logger = new Signale(options); // Sensitive
            `,
      errors: [
        {
          line: 6,
          endLine: 6,
          column: 26,
          endColumn: 33,
          message: JSON.stringify({
            message: 'Make sure confidential information is not logged here.',
            secondaryLocations: [{ column: 22, line: 3, endColumn: 7, endLine: 5 }],
          }),
        },
      ],
    },
    {
      code: `
      const signale = require('signale');
      const logger = new signale.Signale(); // Sensitive
            `,
      errors: [
        {
          line: 3,
          endLine: 3,
          column: 26,
          endColumn: 41,
          message: JSON.stringify({
            message: 'Make sure confidential information is not logged here.',
            secondaryLocations: [],
          }),
        },
      ],
    },
    {
      code: `
      const {Signale} = require('signale');
      const logger = new Signale(); // Sensitive
            `,
      errors: [
        {
          message: JSON.stringify({
            message: 'Make sure confidential information is not logged here.',
            secondaryLocations: [],
          }),
        },
      ],
    },
  ],
});
