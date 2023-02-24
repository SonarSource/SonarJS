/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { rule } from 'linting/eslint/rules/dns-prefetching';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run('Allowing browsers to perform DNS prefetching is security-sensitive', rule, {
  valid: [
    {
      code: `
        
      const dnsPrefetchControl = require('dns-prefetch-control')
      const helmet = require('helmet')
      module.exports.compliantDnsPrefetch = function(app) {
        app.use(dnsPrefetchControl({ allow: false })) // Compliant
      }; 
            `,
    },
    {
      code: `
      const dnsPrefetchControl = require('dns-prefetch-control')
      const helmet = require('helmet')
      module.exports.compliantDnsPrefetch = function(app) {
        app.use(
          helmet()
        );
      }; 
            `,
    },
    {
      code: `
      const dnsPrefetchControl = require('dns-prefetch-control')
      const helmet = require('helmet')
      module.exports.compliantDnsPrefetch = function(app) {
        app.use(dnsPrefetchControl()) // Compliant by default
      }; 
            `,
    },
    {
      code: `
      const dnsPrefetchControl = require('dns-prefetch-control')
      const helmet = require('helmet')
      module.exports.compliantDnsPrefetch = function(app) {
        app.use(helmet.dnsPrefetchControl()) // Compliant by default
      }; 
            `,
    },
    {
      code: `
      const dnsPrefetchControl = require('dns-prefetch-control');
      const helmet = require('helmet');
      module.exports.sensitiveDnsPrefetch = function(app) {
        var options = { allow: true };
        if (x) {
          options = { allow: false };
        }
        app.use(dnsPrefetchControl(options));
      };       
            `,
    },
  ],
  invalid: [
    {
      code: `
      const dnsPrefetchControl = require('dns-prefetch-control')
      const helmet = require('helmet')
      module.exports.sensitiveDnsPrefetch = function(app) {
        app.use(dnsPrefetchControl({ allow: true })) // Sensitive
      };       
            `,
      errors: [
        {
          line: 5,
          endLine: 5,
          column: 17,
          endColumn: 35,
          message: JSON.stringify({
            message: 'Make sure allowing browsers to perform DNS prefetching is safe here.',
            secondaryLocations: [{ column: 37, line: 5, endColumn: 48, endLine: 5 }],
          }),
        },
      ],
    },
    {
      code: `
      const dnsPrefetchControl = require('dns-prefetch-control')
      const helmet = require('helmet')
      module.exports.sensitiveDnsPrefetch = function(app) {
        app.use(
          helmet.dnsPrefetchControl({
            allow: true,
          })
        );
      }; 
            `,
      errors: [
        {
          line: 6,
          endLine: 6,
          column: 11,
          endColumn: 36,
          message: JSON.stringify({
            message: 'Make sure allowing browsers to perform DNS prefetching is safe here.',
            secondaryLocations: [{ column: 12, line: 7, endColumn: 23, endLine: 7 }],
          }),
        },
      ],
    },
    {
      code: `
      const dnsPrefetchControl = require('dns-prefetch-control')
      const helmet = require('helmet')
      module.exports.sensitiveDnsPrefetch = function(app) {
        app.use(
          helmet({
            dnsPrefetchControl: false, // Sensitive
          })
        );
      };  
            `,
      errors: [
        {
          line: 6,
          endLine: 6,
          column: 11,
          endColumn: 17,
          message: JSON.stringify({
            message: 'Make sure allowing browsers to perform DNS prefetching is safe here.',
            secondaryLocations: [{ column: 12, line: 7, endColumn: 37, endLine: 7 }],
          }),
        },
      ],
    },
  ],
});
