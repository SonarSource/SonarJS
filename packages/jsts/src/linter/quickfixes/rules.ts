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
  ...(() => {
    try {
      require.resolve('eslint-plugin-react');
      return [
        'S6754',
        'S6479',
        'S6747',
      ];
    } catch {
      return [];
    }
  })(),

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
