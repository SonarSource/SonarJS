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

import { defineConfig } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
  // matches all files because it doesn't specify the `files` or `ignores` key
  {
    ignores: [
      '**/fixtures/**/*', // Ignore all fixtures folders at any depth
      '**/fixtures/*', // Ignore all files directly in fixtures folders
      '**/*.fixture.*', // Ignore files with .fixture in the name
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      unicorn,
    },
    rules: {
      // Unicorn plugin rules (68 total)
      'unicorn/catch-error-name': ['error', { ignore: ['^(e|ex|exception|err)$'] }],
      'unicorn/consistent-date-clone': 'error',
      'unicorn/consistent-empty-array-spread': 'error',
      // 'unicorn/consistent-function-scoping': 'error',
      'unicorn/error-message': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-accessor-recursion': 'error',
      'unicorn/no-anonymous-default-export': 'error',
      // 'unicorn/no-array-callback-reference': 'error',
      // 'unicorn/no-array-for-each': 'error',
      'unicorn/no-array-method-this-argument': 'error',
      // 'unicorn/no-await-expression-member': 'error',
      // 'unicorn/no-for-loop': 'error', /// Makes an error
      'unicorn/no-instanceof-builtins': 'error',
      'unicorn/no-invalid-fetch-options': 'error',
      'unicorn/no-named-default': 'error',
      'unicorn/no-negated-condition': 'error',
      'unicorn/no-negation-in-equality-check': 'error',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/no-single-promise-in-promise-methods': 'error',
      'unicorn/no-thenable': 'error',
      'unicorn/no-this-assignment': 'error',
      'unicorn/no-typeof-undefined': 'error',
      'unicorn/no-unnecessary-polyfills': 'error',
      'unicorn/no-unreadable-iife': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',

      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-zero-fractions': 'error',
      'unicorn/numeric-separators-style': ['error', { onlyIfContainsSeparator: true }],
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-blob-reading-methods': 'error',
      'unicorn/prefer-class-fields': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-dom-node-dataset': 'error',
      'unicorn/prefer-dom-node-remove': 'error',
      'unicorn/prefer-export-from': 'error',
      'unicorn/prefer-global-this': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-math-min-max': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/prefer-modern-dom-apis': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/prefer-native-coercion-functions': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-prototype-methods': 'error',
      'unicorn/prefer-regexp-test': 'error',
      // 'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-set-size': 'error',
      'unicorn/prefer-single-call': 'error',
      // 'unicorn/prefer-string-raw': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-structured-clone': 'error',
      'unicorn/prefer-top-level-await': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/require-module-specifiers': 'error',
    },
  },
]);
