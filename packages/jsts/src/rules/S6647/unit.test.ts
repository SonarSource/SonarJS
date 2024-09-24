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
import { rule } from './/index.ts';

const ruleTester = new RuleTester({
  parser: require.resolve('@babel/eslint-parser'),
  parserOptions: { ecmaVersion: 2015, requireConfigFile: false },
});

ruleTester.run(`Unnecessary constructors should be removed with @babel/eslint-parser`, rule, {
  valid: [
    {
      code: `class Foo {}`,
    },
    {
      // This test case is coming from closure library https://github.com/google/closure-library/blob/7818ff7dc0b53555a7fb3c3427e6761e88bde3a2/closure/goog/labs/net/webchannel/testing/fakewebchannel.js
      code: `
class FakeWebChannel extends EventTarget {
  
  /**
   * @param {!WebChannel.MessageData} messageData
   * @override
   */
  constructor(messageData) {
    super();

    /** @private {?boolean} */
    this.open_ = null;

    /** @private @const {!Array<!WebChannel.MessageData>} */
    this.messages_ = [];
  }
  
}
      `,
    },
  ],
  invalid: [
    {
      code: `
      class Invalid2 extends Bar {
        constructor(){ // Noncompliant
          super();
        }
      }
      `,
      errors: 1,
    },
  ],
});
