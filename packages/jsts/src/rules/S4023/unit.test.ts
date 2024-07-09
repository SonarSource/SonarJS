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
ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: 'interface A { x: string }',
    },
    {
      code: 'interface A { x: string, y: string }; interface B extends Pick<A, "x"> {}',
    },
  ],
  invalid: [
    {
      code: 'interface A {}',
      errors: 1,
    },
    {
      code: 'interface A extends "foo" {}',
      errors: 1,
      output: 'type A = "foo"',
    },
    {
      code: 'interface A extends Z {}',
      errors: 1,
      output: 'type A = Z',
    },
  ],
});
