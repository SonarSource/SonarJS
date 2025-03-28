/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S6479', () => {
  it('S6479', () => {
    const ruleTester = new DefaultParserRuleTester();

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
  });
});
