/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './rule.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';

const ruleTester = new NodeRuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
});

ruleTester.run('Collection sizes and array length comparisons should make sense', rule, {
  valid: [
    {
      code: `
      if (collections.length < 1)    {}
      if (collections.length > 0)    {}
      if (collections.length <= 1)   {}
      if (collections.length >= 1)   {}
      if (collections.length < 50)   {}
      if (collections.length < 5 + 0){}
      if (collections.size() >= 0)   {}
      `,
    },
  ],
  invalid: [
    {
      code: `if (collection.size < 0) {}`,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'size',
            objectName: 'collection',
          },
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 24,
          suggestions: [
            {
              messageId: 'suggestFixedSizeCheck',
              data: {
                operation: 'size',
                operator: '==',
              },
              output: `if (collection.size == 0) {}`,
            },
          ],
        },
      ],
    },
    {
      code: `if (collection.length < 0) {}`,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'collection',
          },
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 26,
        },
      ],
    },
    {
      code: `if (collection.length >= 0) {}`,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'collection',
          },
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 27,
          suggestions: [
            {
              messageId: 'suggestFixedSizeCheck',
              data: {
                operation: 'length',
                operator: '>',
              },
              output: `if (collection.length > 0) {}`,
            },
          ],
        },
      ],
    },
  ],
});

const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterTs.run('Collection sizes and array length comparisons should make sense', rule, {
  valid: [
    {
      code: `
      const arr = [];
      if (arr.length < 1)  {}
      if (arr.length > 0)  {}
      if (arr.length <= 1) {}
      if (arr.length >= 1) {}
      if (arr.length < 50) {}
      if (arr.length < 5 + 0) {}
      `,
    },
    {
      code: `
      const obj = {length: -4, size: -5, foobar: 42};
      if (obj.foobar >= 0) {}
      if (obj.size >= 0)   {}
      if (obj.length >= 0) {}
      if (obj.length < 0)  {}
      if (obj.length < 53) {}
      if (obj.length > 0)  {}
      `,
    },
  ],
  invalid: [
    {
      code: `
      const arr = [];
      if (arr.length < 0) {}
      `,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'arr',
          },
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 25,
        },
      ],
    },
    {
      code: `
      const arr = [];
      if (arr.length >= 0) {}
      `,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'arr',
          },
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
      const arr = new Array();
      if (arr.length >= 0) {}
      `,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'arr',
          },
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
      const set = new Set();
      if (set.length < 0) {}
      `,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'set',
          },
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 25,
        },
      ],
    },
    {
      code: `
      const map = new Map();
      if (map.length < 0) {}
      `,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'map',
          },
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 25,
        },
      ],
    },
    {
      code: `
      const set = new WeakSet();
      if (set.length < 0) {}
      `,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'set',
          },
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 25,
        },
      ],
    },
    {
      code: `
      const map = new WeakMap();
      if (map.length < 0) {}
      `,
      errors: [
        {
          messageId: 'fixCollectionSizeCheck',
          data: {
            propertyName: 'length',
            objectName: 'map',
          },
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 25,
        },
      ],
    },
  ],
});
