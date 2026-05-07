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
import { rule } from './index.js';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

// SonarJS-configured options matching config.ts defaults
const options = [
  {
    allowConstructorOnly: false,
    allowEmpty: false,
    allowStaticOnly: true,
    allowWithDecorator: true,
  },
];

const ruleTester = new NoTypeCheckingRuleTester();

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S2094 upstream sentinel', () => {
  it('upstream no-extraneous-class raises on data-container patterns that decorator suppresses', () => {
    const upstreamRule = tsEslintRules['no-extraneous-class'];
    ruleTester.run('no-extraneous-class', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `class TrieNode {
  constructor(name, parent) {
    this.name = name;
    this.parent = parent;
  }
}`,
          options,
          errors: 1, // direct this.* assignments — suppressed by decorator, raised by upstream
        },
        {
          code: `class PropertyDictionary {
  constructor(source) {
    for (const key in source) {
      this[key] = source[key];
    }
  }
}`,
          options,
          errors: 1, // this.* inside for...in loop — suppressed by decorator, raised by upstream
        },
      ],
    });
  });
});

describe('S2094', () => {
  it('S2094', () => {
    ruleTester.run('Classes should not be empty', rule, {
      valid: [
        {
          // Compliant: direct this.* assignments
          code: `class TrieNode {
  constructor(name, parent) {
    this.name = name;
    this.parent = parent;
    this.children = new Map();
    this.leafIndex = null;
  }
}`,
          options,
        },
        {
          // Compliant: this.* inside for...in loop
          code: `class PropertyDictionary {
  constructor(source) {
    for (const key in source) {
      this[key] = source[key];
    }
  }
}`,
          options,
        },
        {
          // Compliant: this.* inside for loop
          code: `class IndexedContainer {
  constructor(items) {
    for (let i = 0; i < items.length; i++) {
      this[i] = items[i];
    }
  }
}`,
          options,
        },
        {
          // Compliant: this.* inside while loop
          code: `class WhileContainer {
  constructor(queue) {
    let i = 0;
    while (i < queue.length) {
      this[i] = queue[i];
      i++;
    }
  }
}`,
          options,
        },
        {
          // Compliant: this.* inside if branch
          code: `class ConditionalContainer {
  constructor(value) {
    if (value != null) {
      this.value = value;
    }
  }
}`,
          options,
        },
        {
          // Compliant: static members allowed by config
          code: `class Utils {
  static helper() { return 42; }
}`,
          options,
        },
      ],
      invalid: [
        {
          code: `class Empty {}`,
          options,
          errors: 1,
        },
        {
          // Noncompliant: side effects only
          code: `class SideEffects {
  constructor() {
    console.log('created');
  }
}`,
          options,
          errors: 1,
        },
        {
          // Noncompliant: this.* inside nested function
          code: `class NotADataContainer {
  constructor(items) {
    items.forEach(function(item) {
      this.value = item;
    });
  }
}`,
          options,
          errors: 1,
        },
        {
          // Noncompliant: this.* inside arrow function
          code: `class NotADataContainerArrow {
  constructor(items) {
    items.forEach(item => {
      this.value = item;
    });
  }
}`,
          options,
          errors: 1,
        },
      ],
    });
  });
});
