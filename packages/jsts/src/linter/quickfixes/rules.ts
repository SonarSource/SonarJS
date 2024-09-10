/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
  'no-extra-bind',
  'no-extra-boolean-cast',
  'no-extra-semi',
  'no-return-await',
  'no-trailing-spaces',
  'no-undef-init',
  'no-unneeded-ternary',
  'no-unsafe-negation',
  'no-useless-rename',
  'no-var',
  'object-shorthand',
  'prefer-const',
  'prefer-object-has-own',
  'prefer-regex-literals',
  'prefer-template',
  'quotes',
  'radix',
  'semi',

  // decorated eslint core
  'no-empty-function',
  'no-empty',
  'no-lonely-if',
  'no-self-compare',
  'no-throw-literal',
  'no-unreachable',
  'no-unused-private-class-members',
  'no-useless-call',
  'no-useless-constructor',
  'prefer-object-spread',
  'prefer-spread',
  'use-isnan',

  // eslint-plugin-sonarjs
  'no-collection-size-mischeck',
  'no-inverted-boolean-check',
  'no-redundant-jump',
  'non-existent-operator',
  'prefer-immediate-return',
  'prefer-single-boolean-return',
  'prefer-while',

  // eslint-plugin-react
  'hook-use-state',
  'jsx-no-useless-fragment',
  'no-unknown-property',

  // @typescript-eslint plugin
  'no-confusing-non-null-assertion',
  'no-empty-interface',
  'no-explicit-any',
  'no-inferrable-types',
  'no-non-null-assertion',
  'no-unnecessary-type-arguments',
  'no-unnecessary-type-assertion',
  'no-unnecessary-type-constraint',
  'prefer-as-const',
  'prefer-function-type',
  'prefer-namespace-keyword',
  'prefer-nullish-coalescing',
  'prefer-readonly',
  'prefer-return-this-type',
  'prefer-string-starts-ends-with',

  // decorated @typescript-eslint plugin
  'prefer-enum-initializers',
  'prefer-for-of',

  // sonarjs
  'array-constructor',
  'different-types-comparison',
  'inverted-assertion-arguments',
  'no-alphabetical-sort',
  'no-commented-code',
  'no-duplicate-in-composite',
  'no-exclusive-tests',
  'no-global-this',
  'no-in-misuse',
  'no-misleading-array-reverse',
  'no-primitive-wrappers',
  'no-redundant-optional',
  'no-redundant-parentheses',
  'no-undefined-argument',
  'no-unthrown-error',
  'no-unused-function-argument',
  'public-static-readonly',
  'prefer-promise-shorthand',
  'prefer-type-guard',
  'sonar-no-dupe-keys',
  'sonar-no-misleading-character-class',
  'sonar-prefer-read-only-props',
  'sonar-prefer-regexp-exec',
  'switch-without-default',
  'unnecessary-character-escapes',
  'unused-import',

  // eslint-plugin-import
  'no-absolute-path',
  'no-duplicates',

  // eslint core
  'S1537',
  'S113',
  'S6637',
  'S6509',
  'S1116',
  'S4326',
  'S1131',
  'S6645',
  'S6644',
  'S3812',
  'S6650',
  'S3504',
  'S3498',
  'S3353',
  'S6653',
  'S6325',
  'S3512',
  'S1441',
  'S2427',
  'S1438',

  // decorated eslint core
  'S1186',
  'S108',
  'S6660',
  'S6679',
  'S3696',
  'S1763',
  'S1068',
  'S6676',
  'S6647',
  'S6661',
  'S6666',
  'S2688',

  // eslint-plugin-sonarjs
  'S3981',
  'S1940',
  'S3626',
  'S2757',
  'S1488',
  'S1126',
  'S1264',

  // eslint-plugin-react
  'S6754',
  'S6479',
  'S6747',

  // @typescript-eslint plugin
  'S6568',
  'S4023',
  'S4204',
  'S3257',
  'S2966',
  'S4157',
  'S4325',
  'S6569',
  'S6590',
  'S6598',
  'S4156',
  'S6606',
  'S2933',
  'S6565',
  'S6557',

  // decorated @typescript-eslint plugin
  'S6572',
  'S4138',

  // sonarjs
  'S1528',
  'S3403',
  'S3415',
  'S2871',
  'S125',
  'S4621',
  'S6426',
  'S2990',
  'S4619',
  'S4043',
  'S1533',
  'S4781',
  'S1110',
  'S4623',
  'S3984',
  'S1172',
  'S1444',
  'S4634',
  'S4322',
  'S1534',
  'S5868',
  'S6759',
  'S6594',
  'S131',
  'S6535',
  'S1128',

  // eslint-plugin-import
  'S3863',
  'S6859',
  'S7060',
]);
