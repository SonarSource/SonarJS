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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NoTypeCheckingRuleTester();
const messageId = 'prefer-class-fields/error';

ruleTester.run('S7757', rule, {
  valid: [
    'class A { constructor() { observe(this); this.items = []; } }',
    'class A extends B { constructor() { super(); this.items = []; } }',
    'class A { constructor() { this.items = [createItem()]; } }',
    'class A { constructor() { this.items = [...items]; } }',
    'class A { constructor() { this.items = [,]; } }',
    'class A { constructor() { inspect(this.items); this.items = []; } }',
    'class A { constructor() { this.initialize(); this.items = []; } }',
    'class A { constructor() { const self = this; this.items = []; } }',
    'class A { constructor() { this.id = read(this); this.items = []; } }',
    'class A { constructor() { if (skip) return; this.items = []; } }',
    'class A { constructor() { if (enabled) this.items = []; } }',
    'class A { constructor() { this.items = createItems(); this.items = []; } }',
    'class A { constructor() { this.id = createId(); this.items = []; } set items(value) {} }',
    "class A { constructor() { this.id = createId(); this.items = []; } get 'items'() { return []; } }",
    'class A { static #items; constructor() { this.id = createId(); this.#items = []; } }',
    'class A { constructor(public items: unknown[]) { this.id = createId(); this.items = []; } }',
    'class A { constructor(public items: string[]) { this.items = []; } }',
    'class A { constructor(public readonly items: string[] = []) { this.items = []; } }',
    'class A { constructor(public count: number) { this.count = 0; } }',
    'class A { constructor(readonly count = 1) { this.count = 0; } }',
    'class A { constructor() { initialize(); return; this.items = []; } }',
  ].map(code => ({ code })),
  invalid: [
    ...['items', '#items'].flatMap(property =>
      ['[]', '0'].flatMap(value =>
        ['', ' = existingValue'].map(initializer => ({
          // A later field reads the old value. Neither a fix nor a suggestion is safe.
          code: `class Cart {
  ${property}${initializer};
  saved = this.${property};
  constructor() {
    this.${property} = ${value};
  }
}`,
          output: null,
          errors: [{ messageId, suggestions: [] }],
        })),
      ),
    ),
    {
      // A reader before the changed field still reads undefined after the fix.
      code: `class Cart {
  saved = this.items;
  items;
  constructor() {
    this.items = [];
  }
}`,
      output: `class Cart {
  saved = this.items;
  items = [];
  constructor() {
  }
}`,
      errors: [{ messageId }],
    },
    {
      // A new field is added after all existing field initializers.
      code: `class Cart {
  saved = this.items;
  constructor() {
    this.items = [];
  }
}`,
      output: `class Cart {
  saved = this.items;
  constructor() {
  }
  items = [];
}`,
      errors: [{ messageId }],
    },
    {
      // Report both static assignments in the community example in one scan.
      code: `class SampleModel {
  public name: string;
  public id: string;
  public count: number;
  constructor() {
    this.name = "";
    this.id = generateUniqueId();
    this.count = 0;
  }
}`,
      output: `class SampleModel {
  public name: string = "";
  public id: string;
  public count: number;
  constructor() {
    this.id = generateUniqueId();
    this.count = 0;
  }
}`,
      errors: [
        { messageId, line: 6 },
        { messageId, line: 8 },
      ],
    },
    {
      code: `class SampleModel {
  public items: ItemModel[];
  public results: ResultModel[];
  constructor() {
    this.items = [];
    this.results = [];
  }
}`,
      output: `class SampleModel {
  public items: ItemModel[] = [];
  public results: ResultModel[];
  constructor() {
    this.results = [];
  }
}`,
      errors: [
        { messageId, line: 5 },
        { messageId, line: 6 },
      ],
    },
    {
      // The second array is eligible after moving the first one.
      code: `class SampleModel {
  public items: ItemModel[] = [];
  public results: ResultModel[];
  constructor() {
    this.results = [];
  }
}`,
      output: `class SampleModel {
  public items: ItemModel[] = [];
  public results: ResultModel[] = [];
  constructor() {
  }
}`,
      errors: [{ messageId }],
    },
    ...['items', '#items'].map(property => ({
      code: `class A {
  ${property};
  constructor() {
    ;
    this.${property} = [/* keep comment */];
  }
}`,
      output: `class A {
  ${property} = [/* keep comment */];
  constructor() {
    ;
  }
}`,
      errors: [{ messageId }],
    })),
    {
      code: 'class A { constructor() { this.items = []; } }',
      output: 'class A { constructor() {  } \n items = [];\n}',
      errors: [{ messageId }],
    },
    {
      code: `class A {
  items = existingItems;
  constructor() {
    this.items = [];
  }
}`,
      output: null,
      errors: [
        {
          messageId,
          suggestions: [
            {
              messageId: 'prefer-class-fields/suggestion',
              output: `class A {
  items = [];
  constructor() {
  }
}`,
            },
          ],
        },
      ],
    },
  ],
});

ruleTester.run('S7757 known quick-fix limitations', rule, {
  valid: [],
  invalid: [
    {
      // Known limitation: this records the current unsafe fix, not the desired behavior.
      // The accessor initializer reads items before the constructor runs.
      // Moving [] to the field changes saved from undefined to the array.
      code: `class Cart {
  items;
  accessor saved = this.items;
  constructor() {
    this.items = [];
  }
}`,
      output: `class Cart {
  items = [];
  accessor saved = this.items;
  constructor() {
  }
}`,
      errors: [{ messageId, line: 5 }],
    },
    {
      // Known limitation: this records the current unsafe fix, not the desired behavior.
      // The constructor assignment calls the setter and sets saved to the array.
      // The added field hides the setter, so it no longer runs and saved stays undefined.
      code: `class Cart {
  constructor() {
    this.items = [];
  }
  set items(value) {
    this.saved = value;
  }
}`,
      output: `class Cart {
  constructor() {
  }
  set items(value) {
    this.saved = value;
  }
  items = [];
}`,
      errors: [{ messageId, line: 3 }],
    },
  ],
});

ruleTester.run('S7757 additional constructor assignments', rule, {
  valid: [],
  invalid: [
    {
      // Known false positive: the id setter reads items before its constructor assignment.
      // Moving items to a field changes saved from undefined to []. We do not follow setter calls.
      code: `class Cart {
  constructor(id) {
    this.id = id;
    this.items = [];
  }
  set id(value) {
    this.saved = this.items;
  }
}`,
      output: null,
      errors: [{ messageId, line: 4, suggestions: [] }],
    },
    {
      code: `class A {
  constructor() {
    this.id = generateUniqueId();
    this.count = 0;
    this.items = [];
  }
}`,
      output: null,
      errors: [
        { messageId, line: 4 },
        { messageId, line: 5 },
      ],
    },
    {
      code: `class A {
  constructor() {
    const id = generateUniqueId();
    this.items = [];
    this.id = id;
    this.count = 0;
  }
}`,
      output: null,
      errors: [
        { messageId, line: 4 },
        { messageId, line: 6 },
      ],
    },
    {
      code: `class A {
  constructor() {
    initialize();
    ;
    this.count = 0;
    this.items = [];
  }
}`,
      output: null,
      errors: [
        { messageId, line: 5 },
        { messageId, line: 6 },
      ],
    },
    {
      // A read of the instance blocks later reports, without losing earlier ones.
      code: `class A {
  constructor() {
    initialize();
    this.count = 0;
    inspect(this);
    this.items = [];
  }
}`,
      output: null,
      errors: [{ messageId, line: 4 }],
    },
    {
      code: `class A {
  #items;
  constructor() {
    this.id = generateUniqueId();
    this.#items = [];
  }
}`,
      output: null,
      errors: [{ messageId, line: 5 }],
    },
    {
      // Nested classes have their own constructor state.
      code: `class A {
  constructor() {
    const Inner = class {
      constructor() {
        this.id = generateUniqueId();
        this.items = [];
      }
    };
    this.count = 0;
  }
}`,
      output: null,
      errors: [{ messageId, line: 6 }],
    },
  ],
});
