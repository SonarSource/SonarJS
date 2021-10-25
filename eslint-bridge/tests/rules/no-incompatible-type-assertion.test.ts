/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import {RuleTesterTs} from '../RuleTesterTs';
import {rule} from 'rules/no-incompatible-type-assertion';

const ruleTesterTs = new RuleTesterTs();

// Main test cases are in the file no-incompatible-type-assertion.js (comment-based)
// Here we are testing that no issues are reported when no 'chai' import

ruleTesterTs.run('Should not report when no chai import', rule, {
  valid: [
    {
      code: `assert.equal(obj, obj);`,
    },
  ],
  invalid: [
    {
      code: `
      const chai = require('chai');
      const assert = chai.assert;
      assert.equal(obj, obj);`,
      errors: [{ line: 4 }],
    },
  ],
});
