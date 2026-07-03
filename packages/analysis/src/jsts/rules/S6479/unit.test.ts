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
        // a local helper that only reads the list keeps it static
        {
          code: `
function log(xs) { console.log(xs.length); }
export const MyComponent = () => {
    const items = ['a', 'b'];
    log(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
        },
        // a callee we cannot resolve locally keeps the current behavior (suppressed)
        {
          code: `
export const MyComponent = () => {
    const items = ['a', 'b'];
    mutateExternal(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
        },
        // a method callee is not a resolvable local function, so mutations are not attributed
        {
          code: `
export const MyComponent = ({ store }) => {
    const items = ['a', 'b'];
    store.mutate(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
        },
        // a rest parameter is not a plain identifier, so we do not attribute mutations
        {
          code: `
function add(...xs) { xs.push('c'); }
export const MyComponent = () => {
    const items = ['a', 'b'];
    add(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
        },
        // a reassigned parameter no longer aliases the caller's array
        {
          code: `
function replace(xs) { xs = []; xs.push('c'); }
export const MyComponent = () => {
    const items = ['a', 'b'];
    replace(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
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
        // a local helper (function declaration) mutating its parameter makes the list dynamic
        {
          code: `
function add(xs) { xs.push('c'); }
export const MyComponent = () => {
    const items = ['a', 'b'];
    add(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        // a local helper (const arrow) mutating its parameter makes the list dynamic
        {
          code: `
const add = xs => xs.push('c');
export const MyComponent = () => {
    const items = ['a', 'b'];
    add(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        // a local helper (const function expression) mutating its parameter makes the list dynamic
        {
          code: `
const add = function (xs) { xs.push('c'); };
export const MyComponent = () => {
    const items = ['a', 'b'];
    add(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        // element assignment inside the helper also mutates the list
        {
          code: `
function overwrite(xs) { xs[0] = 'z'; }
export const MyComponent = () => {
    const items = ['a', 'b'];
    overwrite(items);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
          errors: 1,
        },
        // mutation through an alias passed to the helper is still detected
        {
          code: `
function add(xs) { xs.push('c'); }
export const MyComponent = () => {
    const items = ['a', 'b'];
    const alias = items;
    add(alias);

    return <>{items.map((item, index) => {
      return <div key={index}>{item}</div>;
    })}</>;
}
`,
          errors: 1,
        },
      ],
    });
  });
});
