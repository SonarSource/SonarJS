/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import {
  decorateSonarNoUnusedClassComponentMethod,
  rule as sonarNoUnusedClassComponentMethods,
} from 'rules/sonar-no-unused-class-component-methods';

const rule = decorateSonarNoUnusedClassComponentMethod(sonarNoUnusedClassComponentMethods);
const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run(`Function parameters with default values should be last`, rule, {
  valid: [
    {
      code: `
      class Foo extends React.Component {
        handleClick() {}
        render() {
          return null;
        }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
        import React from 'react';
        
        class Foo2 extends React.Component {
          handleClick() {}
          render() {
            return null;
          }
        }
      `,
      errors: [
        {
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 22,
          message:
            'Method or property "handleClick" of class "Foo2" is not used inside component body',
        },
      ],
    },
  ],
});
