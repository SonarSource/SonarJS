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
import { Linter } from 'eslint';
import { decorateDefaultParamLast } from 'rules/decorators/default-param-last-decorator';
import { RuleTesterJsWithTypes } from '../../RuleTesterJsWithTypes';

const ruleTester = new RuleTesterJsWithTypes();
const rule = decorateDefaultParamLast(new Linter().getRules().get('default-param-last'));

ruleTester.run(`Function parameters with default values should be last`, rule, {
  valid: [
    {
      code: `function multiply(b, a = 1) {}`,
    },
    {
      code: `function multiply(b = 2, a = 1) {}`,
    },
    {
      code: `function appReducer(state = initialState, action) {}`,
    },
  ],
  invalid: [
    {
      code: `function multiply(a = 1, b) {}`,
      errors: 1,
    },
  ],
});
