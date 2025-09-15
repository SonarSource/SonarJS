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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1751', () => {
  it('S1751', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('no-unreachable-loop', rule, {
      valid: [
        valid(`
    while (cond) {
      1;
    }`),

        valid(`
    while(foo()) {
      bar();
      if (baz()) {
        break;
      }
    }`),

        valid(`
    while(foo()) {
      switch (bar()) {
        case a : continue;
        case b : break
        case c : zoo();
      }
    }`),

        valid(`
    function foo() {
      for(x of arr) {
        doSomething(() => { return "bar";});
      }
    }`),

        valid(`
    while (42)
      continue
    `),

        valid(`
    for (;42;)
      continue
    `),

        valid(`
    function foo() {
      while (42) {
        continue
      }
    }
    while (42) {
      continue;
    }
    `),

        valid(`
    do {
      continue
    } while (42);
    `),

        valid(`
    for (p in obj) {
      foo();
      continue;
    }`),

        valid(`
    while(foo()) {
      if (bar()) {
        continue;
      }
      baz();
      break; // Compliant: the loop can execute more than once
    }`),

        valid(`
    do {
      if(bar()) {
        continue;
      }
      baz();
      break; // Compliant: the loop can execture more than once
    } while (foo())`),

        valid(`
    while(foo()) {
      if (bar()) {
        continue;
      }
      baz();
      continue;
    }`),

        valid(`
    for (let i = 0; foo(); i++) {
      if (bar()) {
        continue;
      }
      baz();
      break; // Compliant
    }`),
        valid(`
    for (i = 0; foo(); i++) {
      baz();
      continue;
    }`),

        valid(`
    function foo(){
      for (;;) {
        if (condition) {
          continue;
        }

        return 42; // OK
      }
    }`),

        valid(`
    function tryCatch() {
      while (cond()) {
        try {
          doSomething();
        } catch (e) {
          continue;
        }

        doSomethingElse();
      }
    }`),

        valid(`
    function fun() {
      while(foo()) {
        bar();
        if (baz()) {
          return;
        }
      }
    }`),
      ],

      invalid: [
        invalid(`
    while (cond) {
      break;
    }`),

        invalid(`
    while(foo()) {
      bar();
      break;
    }`),

        invalid(`
    while(foo()) {
      bar();
      throw x;
    }`),

        invalid(`
    while(foo())
      break;
    `),

        invalid(`
    function f() {
      while(foo()) {
        bar();
        return;
      }
    }`),

        invalid(`
    do {
      bar();
      break;
    } while (foo())`),

        invalid(`
    for (i = 0; foo(); i++) {
      bar();
      break;
    }`),

        invalid(`
    for (p in obj) {
      while(true) {
        bar();
        break;
      }
    }`),

        invalid(`
    while(foo()) {
      if (bar()) {
        break;
      }
      baz();
      break;
    }`),

        invalid(`
    if (cond()) {
      while(foo()) {
        break;
      }
    }`),

        invalid(`
    for (i = 0; foo();) {
      baz();
      break;
    }`),

        invalid(`
    function foo() {
      for (;;) {
        foo();
        return 42;
      }
    }`),

        invalid(`
    while (foo()) {
      if (bar()) {
        doSomething();
        break;
      } else {
        doSomethingElse();
        break;
      }
    }`),

        invalid(`
    function twoReturns() {
      while (foo()) {
        if (bar()) {
          return 42;
        } else {
          return 0;
        }
      }
    }`),
      ],
    });
  });
});

function invalid(code: string) {
  return {
    code,
    errors: [
      {
        messageId: 'invalid',
      },
    ],
  };
}

function valid(code: string) {
  return {
    code,
  };
}
