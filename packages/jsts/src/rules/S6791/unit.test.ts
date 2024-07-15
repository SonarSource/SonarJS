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
import { rule } from './';
import { TypeScriptRuleTester } from '../../../tests/tools';

const ruleTester = new TypeScriptRuleTester();

ruleTester.run(
  'The decorator should refine both message and location, and provide a quickfix',
  rule,
  {
    valid: [
      {
        code: `
import * as React from 'react';
class Component extends React.Component {
    componentWillMount() {}
}`,
      },
    ],
    invalid: [
      {
        code: `
import * as React from 'react';
class Component extends React.Component {
    UNSAFE_componentWillMount() {}
}`,
        errors: [
          {
            message: 'UNSAFE_componentWillMount is unsafe for use in async rendering.',
            line: 4,
            column: 5,
            endColumn: 30,
          },
        ],
      },
    ],
  },
);
