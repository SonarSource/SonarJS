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
import { JavaScriptRuleTester } from '../tools';
import { rule } from './rule';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('Rule S6479 - no-array-index-key', rule, {
  valid: [
    {
      code: `
export const MyComponent = ({items}) => {
    return <>{items.map((item, index) => {
      return <div key={item.id + '' + index}/>;
    })}</>;
}
`,
    },
    {
      code: `
export const MyComponent = ({items}) => {
    return <>{items.map((item, index) => {
      return <div key={\`\${item.id}-\${index}\`}/>;
    })}</>;
}
`,
    },
    {
      code: `
export const MyComponent = ({items}) => {
    const renderItems = () => {
      let i = 0;
      
      return items.map(() => {
        return <div key={i++}/>;
      });
    }
    
    return <>{renderItems()}</>;
}
`,
    },
    {
      code: `
export const MyComponent = ({items}) => {
    const computeKey = (item, index) => {
      return item.id + '' + index;
    }

    return <>{items.map((item, index) => {
      return <div key={computeKey(item, index)}/>;
    })}</>;
}
`,
    },
    {
      code: `
export const MyComponent = ({items}) => {
    const computeKey = (index) => {
      return index;
    }

    return <>{items.map((_item, index) => {
      return <div key={computeKey(index)}/>;
    })}</>;
} // this test should trigger the rule but it seems ESLint is missing it
`,
    },
  ],
  invalid: [
    {
      code: `
export const MyComponent = ({items}) => {
    return <>{items.map((item, index) => {
      return <div key={index}>{item.id}</div>;
    })}</>;
}
`,
      errors: 1,
    },
    {
      code: `
export const MyComponent = ({items}) => {
    return <>{items.map((item, index) => {
      return <div key={\`\${index}\`}>{item.id}</div>;
    })}</>;
}
`,
      errors: 1,
    },
  ],
});
