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
import { rule } from '../rule.js';
import { join } from 'node:path/posix';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const TEST_FILENAME = 'filename.js';
const TS_TEST_FILENAME = 'filename.ts';
const NO_THENABLE_OBJECT_ERROR = 'no-thenable-object';
const NO_THENABLE_CLASS_ERROR = 'no-thenable-class';

describe('S7739', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname); // change current working dir to avoid the package.json lookup going up the tree
  const ruleTester = new DefaultParserRuleTester();
  const tsRuleTester = new NoTypeCheckingRuleTester();
  const testFilePath = join(dirname, TEST_FILENAME);
  const tsTestFilePath = join(dirname, TS_TEST_FILENAME);
  it('S7739 reports when no validation library is a dependency', () => {
    ruleTester.run('S7739 reports when no validation library is a dependency', rule, {
      valid: [
        {
          code: `const obj = { foo: 'bar' };`,
          filename: testFilePath,
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
          filename: testFilePath,
        },
        // False Positive Pattern 2: RHS delegation with bind
        // This pattern makes an object awaitable by delegating to a real Promise's then method.
        {
          code: `
          const promise = new Promise((resolve) => resolve('ready'));
          const result = { data: 'some data' };
          result.then = promise.then.bind(promise);
        `,
          filename: testFilePath,
        },
        // False Positive Pattern 3: RHS delegation directly to another object's then
        // Similar to jQuery's readyList pattern
        {
          code: `
          const readyList = Promise.resolve('ready');
          const result = {};
          result.then = readyList.then;
        `,
          filename: testFilePath,
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
          filename: testFilePath,
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
          filename: testFilePath,
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
          filename: testFilePath,
        },
        // False Positive Pattern 5d: Assignment expression to Promise
        {
          code: `
          let Promise;
          Promise = function(executor) {
            this.state = 'pending';
            this.then = function(onFulfilled) {
              this.onFulfilled = onFulfilled;
            };
          };
        `,
          filename: testFilePath,
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
          filename: testFilePath,
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
          filename: testFilePath,
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
          filename: testFilePath,
        },
        // False Positive Pattern 7: Arrow function delegating to promise.then()
        // This is the ant-design pattern where an arrow function wraps a Promise delegation.
        {
          code: `
          const closePromise = new Promise(resolve => resolve(true));
          const result = () => {};
          result.then = (filled, rejected) => closePromise.then(filled, rejected);
        `,
          filename: testFilePath,
        },
        // Interface shape descriptor: 'then' as a type reference, not a function
        {
          code: `
          const connectionInterface = {
            open: Function,
            send: Function,
            then: Function,
            close: Function,
          };
        `,
          filename: testFilePath,
        },
        // JSON Schema {if, then} conditional construct
        {
          code: `
          const schema = {
            allOf: [
              {
                if: { properties: { group: { const: 'platform' } } },
                then: { properties: { visibility: { enum: ['private', 'shared'] } }, required: ['visibility'] },
              },
            ],
          };
        `,
          filename: testFilePath,
        },
        // JSON Schema {if, then, else} conditional construct
        {
          code: `
          const schema = {
            allOf: [
              {
                if: { properties: { animal: { const: 'Cat' } } },
                then: { properties: { food: { enum: ['meat', 'grass', 'fish'] } }, required: ['food'] },
                else: { properties: { food: { enum: ['worm', 'plankton'] } }, required: ['food'] },
              },
            ],
          };
        `,
          filename: testFilePath,
        },
        // Multiple JSON Schema {if, then} conditionals in allOf
        {
          code: `
          const schema = {
            allOf: [
              {
                if: { properties: { type: { const: 'circle' } } },
                then: { properties: { radius: { type: 'number' } }, required: ['radius'] },
              },
              {
                if: { properties: { type: { const: 'rectangle' } } },
                then: { properties: { width: { type: 'number' }, height: { type: 'number' } }, required: ['width', 'height'] },
              },
            ],
          };
        `,
          filename: testFilePath,
        },
        // Explicit thenable contract: JSDoc @implements {IThenable<?>}
        {
          code: `
          /** @implements {IThenable<?>} */
          class CountingThenable {
            then(onResolve, onReject) {
              return onResolve('ready');
            }
          }
        `,
          filename: testFilePath,
        },
        // Explicit thenable contract: JSDoc @implements {Thenable<string>}
        {
          code: `
          /** @implements {Thenable<string>} */
          class CustomThenable {
            then(onResolve, onReject) {
              return onResolve('ready');
            }
          }
        `,
          filename: testFilePath,
        },
        // Explicit thenable contract on an exported class: the JSDoc precedes the
        // 'export' keyword, not the class declaration itself.
        {
          code: `
          /** @implements {IThenable<?>} */
          export class ExportedThenable {
            then(onResolve, onReject) {
              return onResolve('ready');
            }
          }
        `,
          filename: testFilePath,
        },
        // Explicit thenable contract on a class nested inside another class's method:
        // the contract is attributed to the nearest (inner) class, not the outer one.
        {
          code: `
          class Outer {
            method() {
              /** @implements {IThenable<?>} */
              class Inner {
                then(onResolve) {
                  return onResolve(1);
                }
              }
              return Inner;
            }
          }
        `,
          filename: testFilePath,
        },
        // Explicit thenable contract on a class field (PropertyDefinition), not a method.
        {
          code: `
          /** @implements {IThenable<?>} */
          class FieldThenable {
            then = (onResolve, onReject) => onResolve('ready');
          }
        `,
          filename: testFilePath,
        },
        // Explicit thenable contract with a quoted (statically-known) string key.
        {
          code: `
          /** @implements {IThenable<?>} */
          class QuotedKeyThenable {
            'then'(onResolve, onReject) {
              return onResolve('ready');
            }
          }
        `,
          filename: testFilePath,
        },
        // Explicit thenable contract on a class expression assigned to a variable: the
        // JSDoc precedes the 'const' declaration, not the 'class' keyword itself.
        {
          code: `
          /** @implements {IThenable<?>} */
          const AssignedThenable = class {
            then(onResolve, onReject) {
              return onResolve('ready');
            }
          };
        `,
          filename: testFilePath,
        },
      ],
      invalid: [
        {
          code: `const schema = { then: function() { return this; } };`,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
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
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
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
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
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
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
        },
        // True Positive: Property with computed key - 'then' is still flagged
        {
          code: `
          const obj = {
            [1 + 1]: 'computed',
            then: function() { return this; },
          };
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
        },
        // True Positive: Arrow function assignment NOT delegating to .then()
        {
          code: `
          const result = {};
          result.then = (args) => someOtherCall(args);
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
        },
        // True Positive: Assigning a non-.then method to .then (like jQuery.ready.then = jQuery.fn.ready)
        // RHS accesses a property that is not named 'then', so it's not a Promise delegation
        {
          code: `
          jQuery.ready.then = jQuery.fn.ready;
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
        },
        // {is, then} pattern should be flagged without validation library dependency
        {
          code: `
          const internals = {
            when(field, options) { return options; },
          };
          const schema = internals.when('leftOperand', {
            is: 'someValue',
            then: { type: 'string' },
            otherwise: { type: 'number' },
          });
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
        },
        {
          code: `
          const switchCases = [
            {
              is: 'info',
              then: { type: 'allow' },
            },
            {
              is: 'create',
              then: { type: 'object', required: true },
            },
          ];
        `,
          filename: testFilePath,
          errors: 2,
        },
        {
          code: `
          function createValidator() {
            return {
              when(field, options) { return this; },
              required() { return this; },
            };
          }
          const nameSchema = createValidator().when('hasName', {
            is: true,
            then: (schema) => schema,
          });
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_OBJECT_ERROR }],
        },
        // True Positive: ordinary class 'then' with no thenable contract declared
        {
          code: `
          class Sequencer {
            then(callback) {
              this.callback = callback;
              return this;
            }
          }
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_CLASS_ERROR }],
        },
        // True Positive: @implements names an unrelated interface, not a thenable contract
        {
          code: `
          /** @implements {Matcher} */
          class MatcherSequencer {
            then(matcher) {
              return MatcherSequencer.seq(this, matcher);
            }
          }
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_CLASS_ERROR }],
        },
        // True Positive: the thenable contract is declared on the outer class, but the
        // reported 'then' method belongs to an unannotated nested class. The contract
        // must not leak from the outer class to the inner one.
        {
          code: `
          /** @implements {IThenable<?>} */
          class Outer {
            method() {
              class Inner {
                then(callback) {
                  this.callback = callback;
                  return this;
                }
              }
              return Inner;
            }
          }
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_CLASS_ERROR }],
        },
        // True Positive: the JSDoc mentions 'PromiseLike' outside of the @implements tag's
        // braces. The thenable-contract match must be scoped to the named type, not to
        // any word appearing elsewhere on the same comment line.
        {
          code: `
          /**
           * @implements {Sequencer} -- not a real PromiseLike, just a chaining helper
           */
          class Sequencer {
            then(callback) {
              this.callback = callback;
              return this;
            }
          }
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_CLASS_ERROR }],
        },
        // True Positive: the named JSDoc type is unrelated; it is merely parameterized by
        // a thenable type. The contract match must not look inside type arguments.
        {
          code: `
          /** @implements {Cache<PromiseLike<string>>} */
          class Store {
            then(callback) {
              this.callback = callback;
              return this;
            }
          }
        `,
          filename: testFilePath,
          errors: [{ messageId: NO_THENABLE_CLASS_ERROR }],
        },
      ],
    });
  });

  it('S7739 accepts TypeScript thenable contracts', () => {
    tsRuleTester.run('S7739 accepts TypeScript thenable contracts', rule, {
      valid: [
        {
          code: `
          class CustomPromiseLike implements PromiseLike<string> {
            then<TResult1 = string, TResult2 = never>(
              onfulfilled?: ((value: string) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ): PromiseLike<TResult1 | TResult2> {
              return Promise.resolve(this.value).then(onfulfilled, onrejected);
            }
          }
        `,
          filename: tsTestFilePath,
        },
        // Explicit thenable contract on a class field (PropertyDefinition), not a method.
        {
          code: `
          class FieldPromiseLike implements PromiseLike<string> {
            then = (onfulfilled?: (value: string) => unknown) => Promise.resolve(this.value).then(onfulfilled);
          }
        `,
          filename: tsTestFilePath,
        },
      ],
      invalid: [
        {
          code: `
          class Sequencer {
            then(callback: () => void) {
              this.callback = callback;
              return this;
            }
          }
        `,
          filename: tsTestFilePath,
          errors: [{ messageId: NO_THENABLE_CLASS_ERROR }],
        },
        // True Positive: the implemented interface is unrelated; it is merely parameterized
        // by a thenable type. The contract match must not look inside type arguments.
        {
          code: `
          interface Cache<T> {}
          class Store implements Cache<PromiseLike<string>> {
            then(callback: () => void) {
              this.callback = callback;
              return this;
            }
          }
        `,
          filename: tsTestFilePath,
          errors: [{ messageId: NO_THENABLE_CLASS_ERROR }],
        },
      ],
    });
  });
});
