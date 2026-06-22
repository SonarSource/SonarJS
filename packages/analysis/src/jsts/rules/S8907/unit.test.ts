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
import { describe, it } from 'node:test';
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';

type ReplacementCase = {
  method: string;
  alternative: string;
  reason: string;
  code?: string;
  example?: string;
};

const ARRAY_NULLISH_REASON = 'the library handles nullish values differently from the native API';
const COLLECTION_REASON = 'the library also accepts objects and nullish values';
const COLLECTION_PREDICATE_REASON =
  'the library also accepts objects, nullish values, and shorthand predicates';
const STRING_COERCION_REASON =
  'the library coerces values and handles nullish values differently from the native API';

const additionalReplacementCases: ReplacementCase[] = [
  {
    method: 'all',
    alternative: 'Array.prototype.every()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'any',
    alternative: 'Array.prototype.some()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'bind',
    alternative: 'Function.prototype.bind()',
    reason: 'argument handling is not identical',
    code: '_.bind(fn, thisArg);',
    example: '`fn.bind(thisArg, ...args)`',
  },
  { method: 'collect', alternative: 'Array.prototype.map()', reason: COLLECTION_REASON },
  { method: 'concat', alternative: 'Array.prototype.concat()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'contains',
    alternative: 'Array.prototype.includes()',
    reason: 'the library also accepts strings, objects, and nullish values',
  },
  {
    method: 'detect',
    alternative: 'Array.prototype.find()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'each',
    alternative: 'Array.prototype.forEach()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'endsWith',
    alternative: 'String.prototype.endsWith()',
    reason: STRING_COERCION_REASON,
    code: "_.endsWith(name, 'x');",
  },
  {
    method: 'every',
    alternative: 'Array.prototype.every()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  { method: 'extendOwn', alternative: 'Object.assign()', reason: ARRAY_NULLISH_REASON },
  { method: 'fill', alternative: 'Array.prototype.fill()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'filter',
    alternative: 'Array.prototype.filter()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'findIndex',
    alternative: 'Array.prototype.findIndex()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'foldl',
    alternative: 'Array.prototype.reduce()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'foldr',
    alternative: 'Array.prototype.reduceRight()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'forEach',
    alternative: 'Array.prototype.forEach()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  { method: 'indexOf', alternative: 'Array.prototype.indexOf()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'inject',
    alternative: 'Array.prototype.reduce()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'isNaN',
    alternative: 'Number.isNaN()',
    reason: 'boxed Number objects are handled differently',
    code: '_.isNaN(value);',
  },
  { method: 'join', alternative: 'Array.prototype.join()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'lastIndexOf',
    alternative: 'Array.prototype.lastIndexOf()',
    reason: ARRAY_NULLISH_REASON,
  },
  {
    method: 'padEnd',
    alternative: 'String.prototype.padEnd()',
    reason: STRING_COERCION_REASON,
    code: '_.padEnd(name, 3);',
  },
  { method: 'pairs', alternative: 'Object.entries()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'reduce',
    alternative: 'Array.prototype.reduce()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'reduceRight',
    alternative: 'Array.prototype.reduceRight()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'repeat',
    alternative: 'String.prototype.repeat()',
    reason: STRING_COERCION_REASON,
    code: '_.repeat(name, 3);',
  },
  {
    method: 'replace',
    alternative: 'String.prototype.replace()',
    reason: STRING_COERCION_REASON,
    code: "_.replace(name, 'x', 'y');",
  },
  { method: 'reverse', alternative: 'Array.prototype.reverse()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'select',
    alternative: 'Array.prototype.filter()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  { method: 'slice', alternative: 'Array.prototype.slice()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'some',
    alternative: 'Array.prototype.some()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  {
    method: 'split',
    alternative: 'String.prototype.split()',
    reason: STRING_COERCION_REASON,
    code: "_.split(name, ' ');",
  },
  { method: 'toPairs', alternative: 'Object.entries()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'toUpper',
    alternative: 'String.prototype.toUpperCase()',
    reason: STRING_COERCION_REASON,
    code: '_.toUpper(name);',
  },
  {
    method: 'trim',
    alternative: 'String.prototype.trim()',
    reason: STRING_COERCION_REASON,
    code: '_.trim(name);',
  },
];

function toInvalidCase(replacementCase: ReplacementCase) {
  const code = replacementCase.code ?? `_.${replacementCase.method}(items, callback);`;

  return {
    code: `
import _ from 'lodash';
${code}
`,
    errors: [
      {
        message: expectedCautiousMessage(replacementCase),
      },
    ],
  };
}

function expectedCautiousMessage({
  alternative,
  method,
  reason,
  example,
}: ReplacementCase): string {
  if (example !== undefined) {
    return `Consider ${alternative} instead of ${method}() from lodash; for example, use ${example}. Check that the behavior is equivalent because ${reason}.`;
  }
  return `Consider ${alternative} instead of ${method}() from lodash; check that the behavior is equivalent because ${reason}.`;
}

describe('S8907', () => {
  it('reports lodash and underscore calls with native alternatives', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('prefer-native-lodash-alternative', rule, {
      valid: [
        {
          code: `
const labels = items.map(item => item.label);
const keys = Object.keys(record);
const lower = name.toLowerCase();
`,
        },
        {
          code: `
_.map(items, item => item.label);
lodash.keys(record);
underscore.toLower(name);
`,
        },
        {
          code: `
import _ from 'lodash/fp';
_.map(item => item.label, items);
`,
        },
        {
          code: `
import map from 'lodash/fp/map';
import mapPipeline from 'lodash/map/fp';
import lodashEsMapPipeline from 'lodash-es/map/fp';
const mapPackagePipeline = require('lodash.map/fp');
map(item => item.label, items);
mapPipeline(items, item => item.label);
lodashEsMapPipeline(items, item => item.label);
mapPackagePipeline(items, item => item.label);
`,
        },
        {
          code: `
import _ from 'lodash';
_.last(items);
_.cloneDeep(config);
_.throttle(fn, 10);
_['map'](items, item => item.label);
`,
        },
        {
          code: `
import _ from 'lodash';
_.chain(items).map(item => item.label).value();
_(items).map(item => item.label).value();
`,
        },
        {
          code: `
import lodash from 'lodash';
lodash(items).filter(item => item.enabled).value();
`,
        },
        {
          code: `
import _ from 'lodash';
const shadow = { map() {} };
shadow.map(items);
`,
        },
        {
          code: `
var _ = require('lodash');
_.map(items, function(item) { return item.label; });
`,
          languageOptions: { ecmaVersion: 3, sourceType: 'script' },
        },
        {
          code: `
var _ = require('lodash');
_.find(items, function(item) { return item.active; });
`,
          languageOptions: { ecmaVersion: 5, sourceType: 'script' },
        },
        {
          code: `
import _ from 'lodash';
_.includes(items, value);
`,
          languageOptions: { ecmaVersion: 2015 },
        },
        {
          code: `
import _ from 'lodash';
_.values(record);
`,
          languageOptions: { ecmaVersion: 2016 },
        },
        {
          code: `
import _ from 'lodash';
_.entries(record);
_.padStart(name, 3);
`,
          languageOptions: { ecmaVersion: 2016 },
        },
        {
          code: `
import _ from 'lodash';
_.flatten(items);
`,
          languageOptions: { ecmaVersion: 2018 },
        },
      ],
      invalid: [
        ...additionalReplacementCases.map(toInvalidCase),
        {
          code: `
import _ from 'lodash';
const labels = _.map(items, item => item.label);
`,
          errors: [
            {
              message:
                'Consider Array.prototype.map() instead of map() from lodash; check that the behavior is equivalent because the library also accepts objects and nullish values.',
              line: 3,
              column: 18,
              endColumn: 21,
            },
          ],
        },
        {
          code: `
import { map } from 'lodash';
const labels = map(items, item => item.label);
`,
          errors: [
            {
              message:
                'Consider Array.prototype.map() instead of map() from lodash; check that the behavior is equivalent because the library also accepts objects and nullish values.',
              line: 3,
              column: 16,
              endColumn: 19,
            },
          ],
        },
        {
          code: `
import { map } from 'lodash-es';
const labels = map(items, item => item.label);
`,
          errors: [
            {
              message:
                'Consider Array.prototype.map() instead of map() from lodash-es; check that the behavior is equivalent because the library also accepts objects and nullish values.',
              line: 3,
              column: 16,
              endColumn: 19,
            },
          ],
        },
        {
          code: `
import { map as lodashMap } from 'lodash';
const labels = lodashMap(items, item => item.label);
`,
          errors: [
            {
              message:
                'Consider Array.prototype.map() instead of map() from lodash; check that the behavior is equivalent because the library also accepts objects and nullish values.',
            },
          ],
        },
        {
          code: `
import map from 'lodash/map';
const labels = map(items, item => item.label);
`,
          errors: [
            {
              message:
                'Consider Array.prototype.map() instead of map() from lodash; check that the behavior is equivalent because the library also accepts objects and nullish values.',
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const activeUser = _.find(users, user => user.active);
`,
          languageOptions: { ecmaVersion: 2015 },
          errors: [
            {
              message:
                'Consider Array.prototype.find() instead of find() from lodash; check that the behavior is equivalent because the library also accepts objects, nullish values, and shorthand predicates.',
            },
          ],
        },
        {
          code: `
const { keys } = require('underscore');
const names = keys(record);
`,
          errors: [
            {
              message:
                'Consider Object.keys() instead of keys() from underscore.js; check that the behavior is equivalent because the library handles nullish values differently from the native API.',
              line: 3,
              column: 15,
              endColumn: 19,
            },
          ],
        },
        {
          code: `
const uniq = require('lodash.uniq');
const values = uniq(items);
`,
          languageOptions: { ecmaVersion: 2015 },
          errors: [
            {
              message:
                'Consider Set instead of uniq() from lodash; for example, use `[...new Set(values)]`. Check that the behavior is equivalent because the library handles nullish values differently from the native API.',
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const tail = _.drop(items, count);
const head = _.dropRight(items, count);
const end = _.takeRight(items, count);
`,
          errors: [
            {
              message:
                'Consider Array.prototype.slice() instead of drop() from lodash; for example, use `array.slice(n)`. Check that the behavior is equivalent because the library handles nullish values differently from the native API.',
            },
            {
              message:
                'Consider Array.prototype.slice() instead of dropRight() from lodash; for example, use `array.slice(0, -n)`. Check that the behavior is equivalent because the library handles nullish values differently from the native API.',
            },
            {
              message:
                'Consider Array.prototype.slice() instead of takeRight() from lodash; for example, use `array.slice(-n)`. Check that the behavior is equivalent because the library handles nullish values differently from the native API.',
            },
          ],
        },
        {
          code: `
const isArray = require('lodash/isArray');
const valid = isArray(value);
`,
          errors: [
            {
              message: 'Use Array.isArray() instead of isArray() from lodash.',
              line: 3,
              column: 15,
              endColumn: 22,
            },
          ],
        },
        {
          code: `
const startsWith = require('lodash.startswith');
const valid = startsWith(name, 'x');
`,
          errors: [
            {
              message:
                'Consider String.prototype.startsWith() instead of startsWith() from lodash; check that the behavior is equivalent because the library coerces values and handles nullish values differently from the native API.',
            },
          ],
        },
        {
          code: `
import _ from 'underscore';
const lower = _.toLower(name);
`,
          errors: [
            {
              message:
                'Consider String.prototype.toLowerCase() instead of toLower() from underscore.js; check that the behavior is equivalent because the library coerces values and handles nullish values differently from the native API.',
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const merged = _.assign(target, source);
`,
          languageOptions: { ecmaVersion: 2015 },
          errors: [
            {
              message:
                'Consider Object.assign() instead of assign() from lodash; check that the behavior is equivalent because the library handles nullish targets differently from Object.assign.',
            },
          ],
        },
        {
          code: `
import _ from 'underscore';
const finite = _.isFinite(value);
`,
          languageOptions: { ecmaVersion: 2015 },
          errors: [
            {
              message:
                'Consider Number.isFinite() instead of isFinite() from underscore.js; check that the behavior is equivalent because the library can handle non-number values differently from Number.isFinite.',
            },
          ],
        },
        {
          code: `
const integer = require('lodash/isInteger');
const valid = integer(value);
`,
          languageOptions: { ecmaVersion: 2015 },
          errors: [
            {
              message: 'Use Number.isInteger() instead of isInteger() from lodash.',
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const has = _.includes(items, value);
`,
          languageOptions: { ecmaVersion: 2016 },
          errors: [
            {
              message:
                'Consider Array.prototype.includes() instead of includes() from lodash; check that the behavior is equivalent because the library also accepts strings, objects, and nullish values.',
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const values = _.values(record);
`,
          languageOptions: { ecmaVersion: 2017 },
          errors: [
            {
              message:
                'Consider Object.values() instead of values() from lodash; check that the behavior is equivalent because the library handles nullish values differently from the native API.',
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const pairs = _.entries(record);
const padded = _.padStart(name, 3);
`,
          languageOptions: { ecmaVersion: 2017 },
          errors: [
            {
              message:
                'Consider Object.entries() instead of entries() from lodash; check that the behavior is equivalent because the library handles nullish values differently from the native API.',
            },
            {
              message:
                'Consider String.prototype.padStart() instead of padStart() from lodash; check that the behavior is equivalent because the library coerces values and handles nullish values differently from the native API.',
            },
          ],
        },
        {
          code: `
import _ from 'lodash';
const flat = _.flatten(items);
`,
          languageOptions: { ecmaVersion: 2019 },
          errors: [
            {
              message:
                'Consider Array.prototype.flat() instead of flatten() from lodash; check that the behavior is equivalent because the library handles nullish values differently from the native API.',
            },
          ],
        },
      ],
    });
  });
});
