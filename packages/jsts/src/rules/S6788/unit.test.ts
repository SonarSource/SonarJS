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
import { rule } from './/index.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new TypeScriptRuleTester();

ruleTester.run(`Decorated rule should reword the issue message`, rule, {
  valid: [
    {
      code: `type Foo = () => number;`,
    },
  ],
  invalid: [
    {
      code: `
class MyComponent extends Component {
  componentDidMount() {
    findDOMNode(this).scrollIntoView();
  }
  render() {
    return <div />
  }
}
      `,
      errors: [
        {
          message:
            "Do not use findDOMNode. It doesn't work with function components and is deprecated in StrictMode.",
        },
      ],
    },
  ],
});
