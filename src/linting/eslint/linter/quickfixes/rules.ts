/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
/**
 * The set of enabled rules with quick fixes
 *
 * The purpose of this set is to declare all the rules providing
 * ESLint fixes and suggestions that the linter should consider
 * during the transformation of an ESLint message into a SonarQube
 * issue, including quick fixes.
 *
 * This set needs to be updated whenever one wants to provide (or
 * filter out) the quick fix of a rule, be it an internal one or
 * an external one.
 */
export const quickFixRules = new Set([
  // eslint core
  'comma-dangle',
  'eol-last',
  'no-extra-boolean-cast',
  'no-extra-semi',
  'no-trailing-spaces',
  'no-unsafe-negation',
  'no-var',
  'object-shorthand',
  'prefer-const',
  'prefer-regex-literals',
  'prefer-template',
  'quotes',
  'radix',
  'semi',

  // decorated eslint core
  'no-dupe-keys',
  'no-duplicate-imports',
  'no-empty',
  'no-empty-function',
  'no-throw-literal',
  'no-unreachable',
  'use-isnan',

  // eslint-plugin-sonarjs
  'no-collection-size-mischeck',
  'no-inverted-boolean-check',
  'no-redundant-jump',
  'non-existent-operator',
  'prefer-immediate-return',
  'prefer-single-boolean-return',
  'prefer-while',

  // @typescript-eslint plugin
  'no-empty-interface',
  'no-explicit-any',
  'no-inferrable-types',
  'no-unnecessary-type-arguments',
  'no-unnecessary-type-assertion',
  'prefer-namespace-keyword',
  'prefer-readonly',
  'no-non-null-assertion',

  // decorated @typescript-eslint plugin
  'prefer-for-of',

  // sonarjs
  'different-types-comparison',
  'inverted-assertion-arguments',
  'no-alphabetical-sort',
  'no-commented-code',
  'no-duplicate-in-composite',
  'no-exclusive-tests',
  'no-global-this',
  'no-in-misuse',
  'no-primitive-wrappers',
  'no-redundant-optional',
  'no-redundant-parentheses',
  'no-undefined-argument',
  'no-unthrown-error',
  'no-unused-function-argument',
  'prefer-promise-shorthand',
  'prefer-type-guard',
  'unused-import',
]);
