/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
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
}
`,
        },
        {
          code: `
export const MyComponent = () => {
    return <>{Array.from({ length: 3 }).map((_item, index) => {
      return <div key={index}>{index}</div>;
    })}</>;
}
`,
        },
        {
          code: `
export const MyComponent = () => {
    return <>{['left', 'center', 'right'].map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
        },
        {
          code: `
export const MyComponent = () => {
    const tabs = ['home', 'settings', 'profile'];
    const staticTabs = tabs;

    return <>{staticTabs.map((tab, index) => {
      return <div key={index}>{tab}</div>;
    })}</>;
}
`,
        },
        // M3: imported const array treated as static when not mutated locally
        {
          code: `
import { TABS } from './tabs';
export const MyComponent = () => {
    return <>{TABS.map((tab, index) => {
      return <div key={index}>{tab}</div>;
    })}</>;
}
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
        {
          code: `
export const MyComponent = ({items}) => {
    return <>{[...items].map((item, index) => {
      return <div key={index}>{item.id}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        {
          code: `
export const MyComponent = () => {
    const items = [];
    items.push('left');
    items.push('right');

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        {
          code: `
export const MyComponent = () => {
    const items = ['a', 'b', 'c'];
    const alias = items;
    alias.push('d');

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        // M1: inline array with identifier elements is not static
        {
          code: `
export const MyComponent = ({ leftTab, rightTab }) => {
    return <>{[leftTab, rightTab].map((tab, index) => {
      return <div key={index}>{tab}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        // M2: index from outer map used inside nested find callback — should still report
        {
          code: `
const STATIC = ['home', 'about', 'contact'];
export const MyComponent = ({ items }) => {
    return <>{items.map((item, index) => (
      STATIC.find((_, i) => <div key={index}>{item}</div>)
    ))}</>;
}
`,
          errors: 1,
        },
        // M4: Array.from with dynamic length is not a placeholder list
        {
          code: `
export const MyComponent = ({ users }) => {
    return <>{Array.from({ length: users.length }).map((_, index) => {
      return <div key={index}>{users[index]}</div>;
    })}</>;
}
`,
          errors: 1,
        },
      ],
    });
  });
});
