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
import { rule } from '@sonar/jsts/rules/super-invocation';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('"super()" should be invoked appropriately', rule, {
  valid: [
    {
      code: `
      var B1b = class extends A1 {
        constructor() {
          super();                 // OK
          super.x = 1;
        }
      }
            `,
    },
  ],
  invalid: [
    {
      code: `class A extends B { constructor() {this.bar();}}`,
      errors: 2,
    },
    {
      code: `class A extends B { constructor(a) { while (a) super(); } }`,
      errors: 2,
    },
  ],
});
