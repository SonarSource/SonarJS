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
    // Do not move initializers across code that may observe the instance.
    `class SampleModel {
      public id: string;
      public count: number;
      constructor() {
        this.id = generateUniqueId();
        this.count = 0;
      }
    }`,
    'class A { constructor() { observe(this); this.items = []; } }',
    'class A extends B { constructor() { super(); this.items = []; } }',
    'class A { constructor() { this.items = [createItem()]; } }',
    'class A { constructor() { this.items = [...items]; } }',
    'class A { constructor() { this.items = [,]; } }',
  ].map(code => ({ code })),
  invalid: [
    {
      // The community report: only the first statement is checked on each pass.
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
      errors: [{ messageId, line: 6 }],
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
      errors: [{ messageId, line: 5 }],
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
