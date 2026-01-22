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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7718', () => {
  it('S7718', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Catch clause variable names should comply with a naming convention', rule, {
      valid: [
        // Standard compliant names
        {
          code: `try { foo(); } catch (error) { console.log(error); }`,
        },
        {
          code: `try { foo(); } catch (error_) { console.log(error_); }`,
        },
        // Short forms: e, ex (already in default ignore pattern)
        {
          code: `try { foo(); } catch (e) { console.log(e); }`,
        },
        {
          code: `try { foo(); } catch (ex) { console.log(ex); }`,
        },
        // Exact match for exception
        {
          code: `try { foo(); } catch (exception) { console.log(exception); }`,
        },
        // Exact match for err
        {
          code: `try { foo(); } catch (err) { console.log(err); }`,
        },
        // False positive pattern: Minifier-generated catch parameter names
        // Build tools (Babel, Webpack, Rollup) auto-generate variable names with
        // patterns like x$11, e$12 (single word character + $ + one or more digits)
        {
          code: `
            // Minifier pattern: x$11
            try { JSON.parse(data); } catch (x$11) { console.log(x$11.message); }
          `,
        },
        {
          code: `
            // Minifier pattern: e$12
            try { fetch(url); } catch (e$12) { logError(e$12); }
          `,
        },
        {
          code: `
            // Minifier pattern: a$1
            try { riskyOperation(); } catch (a$1) { handleError(a$1); }
          `,
        },
        // False positive pattern: Underscore-prefixed catch parameter names
        // In JavaScript, underscore prefix is a convention for intentionally unused variables
        {
          code: `
            // Underscore prefix: _e indicates intentionally unused error
            try { riskyOperation(); } catch (_e) { return null; }
          `,
        },
        {
          code: `
            // Underscore prefix: _ignored indicates intentionally unused error
            try { fn(); } catch (_ignored) { return fallback; }
          `,
        },
        {
          code: `
            // Double underscore pattern: __ indicates intentionally unused error
            try { require('buffer'); } catch (__) {}
          `,
        },
        {
          code: `
            // Underscore prefix: _error
            try { mayFail(); } catch (_error) { return defaultValue; }
          `,
        },
        // Case-insensitive 'err' suffix patterns
        {
          code: `
            // Case-insensitive: myErr
            try { fetch(url); } catch (myErr) { log(myErr); }
          `,
        },
        {
          code: `
            // Case-insensitive: networkErr
            try { connect(); } catch (networkErr) { retry(networkErr); }
          `,
        },
        {
          code: `
            // Case-insensitive: parseERR (all caps suffix)
            try { JSON.parse(data); } catch (parseERR) { handle(parseERR); }
          `,
        },
        // Case-insensitive 'exception' suffix patterns
        {
          code: `
            // Case-insensitive: myException
            try { process(); } catch (myException) { log(myException); }
          `,
        },
        {
          code: `
            // Case-insensitive: NetworkException
            try { connect(); } catch (NetworkException) { retry(NetworkException); }
          `,
        },
        {
          code: `
            // Case-insensitive: parseEXCEPTION (all caps suffix)
            try { parse(data); } catch (parseEXCEPTION) { handle(parseEXCEPTION); }
          `,
        },
        // Promise .catch() handler patterns
        {
          code: `promise.catch(error => console.log(error));`,
        },
        {
          code: `
            // Minifier pattern in .catch() handler
            promise.catch(x$5 => console.log(x$5));
          `,
        },
        {
          code: `
            // Underscore prefix in .catch() handler
            promise.catch(_e => fallback);
          `,
        },
        // Promise .then() rejection handler patterns
        {
          code: `promise.then(res => res, error => console.log(error));`,
        },
        {
          code: `
            // Minifier pattern in .then() rejection handler
            promise.then(res => res, e$3 => log(e$3));
          `,
        },
        {
          code: `
            // Underscore prefix in .then() rejection handler
            promise.then(res => res, _err => null);
          `,
        },
      ],
      invalid: [
        // Non-compliant names that should still raise issues
        {
          code: `try { foo(); } catch (badName) { console.log(badName); }`,
          errors: [{ message: /The catch parameter `badName` should be named `error`/ }],
        },
        {
          code: `try { foo(); } catch (x) { console.log(x); }`,
          errors: [{ message: /The catch parameter `x` should be named `error`/ }],
        },
        {
          code: `try { foo(); } catch (foo) { console.log(foo); }`,
          errors: [{ message: /The catch parameter `foo` should be named `error`/ }],
        },
        {
          code: `try { foo(); } catch (result) { console.log(result); }`,
          errors: [{ message: /The catch parameter `result` should be named `error`/ }],
        },
        // Names that look similar but don't match patterns
        {
          // 'er' is not 'err' - should raise
          code: `try { foo(); } catch (er) { console.log(er); }`,
          errors: [{ message: /The catch parameter `er` should be named `error`/ }],
        },
        // Promise .catch() handler non-compliant names
        {
          code: `promise.catch(badName => console.log(badName));`,
          errors: [{ message: /The catch parameter `badName` should be named `error`/ }],
        },
        // Promise .then() rejection handler non-compliant names
        {
          code: `promise.then(res => res, badName => console.log(badName));`,
          errors: [{ message: /The catch parameter `badName` should be named `error`/ }],
        },
      ],
    });
  });
});
