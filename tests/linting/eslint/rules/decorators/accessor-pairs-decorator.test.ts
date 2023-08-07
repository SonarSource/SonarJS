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
import { eslintRules } from '@sonar/jsts/rules/core';
import { JavaScriptRuleTester } from '../../../../tools';
import { decorateAccessorPairs } from '@sonar/jsts/rules/decorators/accessor-pairs-decorator';

const ruleTester = new JavaScriptRuleTester();
const rule = decorateAccessorPairs(eslintRules['accessor-pairs']);

ruleTester.run(`Property getters and setters should come in pairs`, rule, {
  valid: [
    {
      code: `
      class C {
        get m() { return this.a; }
        set m(a) { this.a = a; }
      }`,
    },
    {
      code: `
      class C {
        @Input()
        set m(a) { this.a = a; }
      }`,
    },
  ],
  invalid: [
    {
      code: `
      class C {
        set m(a) { this.a = a; }
      }`,
      errors: 1,
    },
    {
      code: `
      class C {
        @Input
        set m(a) { this.a = a; }
      }`,
      errors: 1,
    },
    {
      code: `
      class C {
        @NonAngularInput()
        set m(a) { this.a = a; }
      }`,
      errors: 1,
    },
  ],
});
