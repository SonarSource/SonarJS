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
import { rule } from './index.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe } from 'node:test';
import { rules } from '../external/typescript-eslint/index.js';
import parser from '@babel/eslint-parser';
import { decorate } from './decorator.js';
import { expect } from 'expect';

const originalRule = decorate(rules['no-useless-constructor']);

const ruleTester = new RuleTester({
  parser,
  parserOptions: {
    requireConfigFile: false,
  },
});

// This test case is coming from closure library https://github.com/google/closure-library/blob/7818ff7dc0b53555a7fb3c3427e6761e88bde3a2/closure/goog/labs/net/webchannel/testing/fakewebchannel.js
const problemCode = `class FakeWebChannel extends EventTarget {
  
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
  
}`;

describe('S6647', () => {
  ruleTester.run(`Unnecessary constructors should be removed`, rule, {
    valid: [
      {
        code: problemCode,
      },
    ],
    invalid: [],
  });

  // When this test fails to pass, we can remove our implementation and go back to original
  // 'no-useless-constructor' from 'typescript-eslint'
  // https://github.com/SonarSource/SonarJS/pull/4473
  expect(() => {
    ruleTester.run(`Unnecessary constructors should be removed`, originalRule, {
      valid: [
        {
          code: problemCode,
        },
      ],
      invalid: [],
    });
  }).toThrow();
});
