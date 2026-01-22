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

    // Default options from config.ts - matches patterns that should NOT raise issues
    const defaultOptions = [
      {
        ignore: [
          '^(e|ex)$',
          '[Ee][Xx][Cc][Ee][Pp][Tt][Ii][Oo][Nn]$',
          '[Ee][Rr][Rr]$',
          '^_',
          '^\\w\\$\\d+$',
        ],
      },
    ];

    ruleTester.run('Catch clause variable names should comply with a naming convention', rule, {
      valid: [
        // Standard compliant names
        { code: `try { foo(); } catch (error) { console.log(error); }`, options: defaultOptions },
        { code: `try { foo(); } catch (error_) { console.log(error_); }`, options: defaultOptions },
        // Short forms: e, ex
        { code: `try { foo(); } catch (e) { console.log(e); }`, options: defaultOptions },
        { code: `try { foo(); } catch (ex) { console.log(ex); }`, options: defaultOptions },
        // Standard names: exception, err
        {
          code: `try { foo(); } catch (exception) { console.log(exception); }`,
          options: defaultOptions,
        },
        { code: `try { foo(); } catch (err) { console.log(err); }`, options: defaultOptions },
        // Minifier-generated patterns (e.g., Babel, Webpack)
        { code: `try { foo(); } catch (x$11) { console.log(x$11); }`, options: defaultOptions },
        { code: `try { foo(); } catch (e$12) { console.log(e$12); }`, options: defaultOptions },
        { code: `try { foo(); } catch (a$1) { console.log(a$1); }`, options: defaultOptions },
        // Underscore-prefixed (intentionally unused)
        { code: `try { foo(); } catch (_e) { }`, options: defaultOptions },
        { code: `try { foo(); } catch (_ignored) { }`, options: defaultOptions },
        { code: `try { foo(); } catch (__) { }`, options: defaultOptions },
        { code: `try { foo(); } catch (_error) { }`, options: defaultOptions },
        // Case-insensitive 'err' suffix
        { code: `try { foo(); } catch (myErr) { console.log(myErr); }`, options: defaultOptions },
        {
          code: `try { foo(); } catch (networkErr) { console.log(networkErr); }`,
          options: defaultOptions,
        },
        {
          code: `try { foo(); } catch (parseERR) { console.log(parseERR); }`,
          options: defaultOptions,
        },
        // Case-insensitive 'exception' suffix
        {
          code: `try { foo(); } catch (myException) { console.log(myException); }`,
          options: defaultOptions,
        },
        {
          code: `try { foo(); } catch (NetworkException) { console.log(NetworkException); }`,
          options: defaultOptions,
        },
        {
          code: `try { foo(); } catch (parseEXCEPTION) { console.log(parseEXCEPTION); }`,
          options: defaultOptions,
        },
        // Promise .catch() handler
        { code: `promise.catch(error => console.log(error));`, options: defaultOptions },
        { code: `promise.catch(x$5 => console.log(x$5));`, options: defaultOptions },
        { code: `promise.catch(_e => fallback);`, options: defaultOptions },
        // Promise .then() rejection handler
        { code: `promise.then(res => res, error => console.log(error));`, options: defaultOptions },
        { code: `promise.then(res => res, e$3 => console.log(e$3));`, options: defaultOptions },
        { code: `promise.then(res => res, _err => null);`, options: defaultOptions },
      ],
      invalid: [
        // Non-compliant names that should still raise issues
        {
          code: `try { foo(); } catch (badName) { console.log(badName); }`,
          output: `try { foo(); } catch (error) { console.log(error); }`,
          options: defaultOptions,
          errors: [{ message: /The catch parameter `badName` should be named `error`/ }],
        },
        {
          code: `try { foo(); } catch (x) { console.log(x); }`,
          output: `try { foo(); } catch (error) { console.log(error); }`,
          options: defaultOptions,
          errors: [{ message: /The catch parameter `x` should be named `error`/ }],
        },
        {
          code: `try { foo(); } catch (foo) { console.log(foo); }`,
          output: `try { foo(); } catch (error) { console.log(error); }`,
          options: defaultOptions,
          errors: [{ message: /The catch parameter `foo` should be named `error`/ }],
        },
        {
          code: `try { foo(); } catch (result) { console.log(result); }`,
          output: `try { foo(); } catch (error) { console.log(error); }`,
          options: defaultOptions,
          errors: [{ message: /The catch parameter `result` should be named `error`/ }],
        },
        // Names that look similar but don't match patterns
        {
          code: `try { foo(); } catch (er) { console.log(er); }`,
          output: `try { foo(); } catch (error) { console.log(error); }`,
          options: defaultOptions,
          errors: [{ message: /The catch parameter `er` should be named `error`/ }],
        },
        // Promise .catch() handler non-compliant names
        {
          code: `promise.catch(badName => console.log(badName));`,
          output: `promise.catch(error => console.log(error));`,
          options: defaultOptions,
          errors: [{ message: /The catch parameter `badName` should be named `error`/ }],
        },
        // Promise .then() rejection handler non-compliant names
        {
          code: `promise.then(res => res, badName => console.log(badName));`,
          output: `promise.then(res => res, error => console.log(error));`,
          options: defaultOptions,
          errors: [{ message: /The catch parameter `badName` should be named `error`/ }],
        },
      ],
    });
  });
});
