/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { rule } from '../rule.js';
import { join } from 'node:path/posix';
import { DefaultParserRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7739', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname); // change current working dir to avoid the package.json lookup going up the tree
  const ruleTester = new DefaultParserRuleTester();
  it('S7739 reports when no validation library is a dependency', () => {
    ruleTester.run('S7739 reports when no validation library is a dependency', rule, {
      valid: [
        {
          code: `const obj = { foo: 'bar' };`,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 1: Prototype extension with then method
        // This is a custom Promise-like implementation that extends Promise.prototype
        // and implements then() for Promise interoperability.
        {
          code: `
          function ReactPromise(status, value, reason) {
            this.status = status;
            this.value = value;
            this.reason = reason;
          }
          ReactPromise.prototype = Object.create(Promise.prototype);
          ReactPromise.prototype.then = function (resolve, reject) {
            switch (this.status) {
              case 'fulfilled':
                if (typeof resolve === 'function') {
                  resolve(this.value);
                }
                break;
            }
            return this;
          };
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 2: RHS delegation with bind
        // This pattern makes an object awaitable by delegating to a real Promise's then method.
        {
          code: `
          const promise = new Promise((resolve) => resolve('ready'));
          const result = { data: 'some data' };
          result.then = promise.then.bind(promise);
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 3: RHS delegation directly to another object's then
        // Similar to jQuery's readyList pattern
        {
          code: `
          const readyList = Promise.resolve('ready');
          const result = {};
          result.then = readyList.then;
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 4: Deferred class with then method
        // This is a Deferred pattern implementation (like jQuery.Deferred)
        {
          code: `
          function Deferred() {
            this.callbacks = [];
            this.resolved = false;
            this.value = undefined;
          }
          Deferred.prototype.then = function(onFulfilled, onRejected) {
            if (this.resolved) {
              onFulfilled && onFulfilled(this.value);
            } else {
              this.callbacks.push({ onFulfilled, onRejected });
            }
            return this;
          };
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 5: Class/function named "Promise" with then method
        // This is a Promise polyfill/implementation
        {
          code: `
          function Promise(executor) {
            this.state = 'pending';
            this.value = undefined;
            this.handlers = [];
          }
          Promise.prototype.then = function(onFulfilled, onRejected) {
            if (this.state === 'fulfilled') {
              onFulfilled && onFulfilled(this.value);
            }
            return this;
          };
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 5b: Function expression assigned to Promise
        {
          code: `
          const Promise = function(executor) {
            this.state = 'pending';
            this.then = function(onFulfilled) {
              this.onFulfilled = onFulfilled;
            };
          };
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 5c: Arrow function assigned to Deferred
        {
          code: `
          const Deferred = () => {
            return {
              then: function(callback) { this.callback = callback; }
            };
          };
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 6: Object with then AND catch methods
        // Having both then and catch methods indicates an intentional thenable implementation.
        {
          code: `
          const thenable = {
            value: null,
            error: null,
            then: function(onFulfilled, onRejected) {
              if (this.error) {
                onRejected && onRejected(this.error);
              } else {
                onFulfilled && onFulfilled(this.value);
              }
              return this;
            },
            catch: function(onRejected) {
              if (this.error) {
                onRejected(this.error);
              }
              return this;
            }
          };
        `,
          filename: join(dirname, 'filename.js'),
        },
        // False Positive Pattern 6b: Object with then AND finally methods
        // Having both then and finally methods also indicates an intentional thenable implementation.
        {
          code: `
          const thenable = {
            value: null,
            then: function(onFulfilled, onRejected) {
              onFulfilled && onFulfilled(this.value);
              return this;
            },
            finally: function(onFinally) {
              onFinally && onFinally();
              return this;
            }
          };
        `,
          filename: join(dirname, 'filename.js'),
        },
      ],
      invalid: [
        {
          code: `const schema = { then: function() { return this; } };`,
          filename: join(dirname, 'filename.js'),
          errors: [{ messageId: 'no-thenable-object' }],
        },
        // True Positive: Tween completion callback - not proper thenable protocol semantics
        // This is like paper.js Tween.then which stores a callback but doesn't return a Promise
        {
          code: `
          const tween = {
            _then: null,
            then: function(callback) {
              this._then = callback;
              return this;
            }
          };
        `,
          filename: join(dirname, 'filename.js'),
          errors: [{ messageId: 'no-thenable-object' }],
        },
        // True Positive: Combinator pattern - 'then' used for sequencing, not Promise protocol
        {
          code: `
          const Matcher = {
            then: function(m) {
              return Matcher.seq(this, m);
            }
          };
        `,
          filename: join(dirname, 'filename.js'),
          errors: [{ messageId: 'no-thenable-object' }],
        },
        // True Positive: Object property named 'then' as a data value (not function for thenable)
        {
          code: `
          const keywordIndent = {
            'function': 1,
            'then': 1,
            'do': 1
          };
        `,
          filename: join(dirname, 'filename.js'),
          errors: [{ messageId: 'no-thenable-object' }],
        },
      ],
    });
  });
});
