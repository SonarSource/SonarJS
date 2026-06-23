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
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';

type ReplacementCase = {
  method: string;
  alternative: string;
  reason: string;
  code?: string;
  example?: string;
};

const ARRAY_NULLISH_REASON = 'the library handles nullish values differently from the native API';
const COLLECTION_PREDICATE_REASON =
  'the library also accepts objects, nullish values, and shorthand predicates';
const ARRAY_COLLECTION_METHODS = new Set([
  'contains',
  'every',
  'filter',
  'findIndex',
  'includes',
  'map',
  'reduce',
  'reduceRight',
  'some',
]);

const additionalReplacementCases: ReplacementCase[] = [
  { method: 'concat', alternative: 'Array.prototype.concat()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'contains',
    alternative: 'Array.prototype.includes()',
    reason: 'the library also accepts strings, objects, and nullish values',
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
  { method: 'indexOf', alternative: 'Array.prototype.indexOf()', reason: ARRAY_NULLISH_REASON },
  { method: 'join', alternative: 'Array.prototype.join()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'lastIndexOf',
    alternative: 'Array.prototype.lastIndexOf()',
    reason: ARRAY_NULLISH_REASON,
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
  { method: 'reverse', alternative: 'Array.prototype.reverse()', reason: ARRAY_NULLISH_REASON },
  { method: 'slice', alternative: 'Array.prototype.slice()', reason: ARRAY_NULLISH_REASON },
  {
    method: 'some',
    alternative: 'Array.prototype.some()',
    reason: COLLECTION_PREDICATE_REASON,
  },
  { method: 'toPairs', alternative: 'Object.entries()', reason: ARRAY_NULLISH_REASON },
];

function toInvalidCase(replacementCase: ReplacementCase) {
  const code =
    replacementCase.code ??
    (ARRAY_COLLECTION_METHODS.has(replacementCase.method)
      ? `_.${replacementCase.method}([item], callback);`
      : `_.${replacementCase.method}(items, callback);`);

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
import _ from 'lodash';
_.map(items, item => item.label);
_.filter(items, item => item.enabled);
_.includes(items, value);
`,
        },
        {
          code: `
import _ from 'lodash';
_.map([item], 'label');
_.find([item], { active: true });
`,
        },
        {
          code: `
import _ from 'lodash';
_.trim(name, '"');
`,
        },
        {
          code: `
import _ from 'lodash';
_.all([item], callback);
_.any([item], callback);
_.collect([item], callback);
_.detect([item], callback);
_.each([item], callback);
_.forEach([item], callback);
_.foldl([item], callback);
_.foldr([item], callback);
_.inject([item], callback);
_.select([item], callback);
_.startsWith(name, 'x');
_.padStart(name, 3);
_.toLower(name);
_.bind(fn, thisArg);
_.isFinite(value);
_.isNaN(value);
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
const labels = _.map([item], item => item.label);
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
const labels = map([item], item => item.label);
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
const labels = map([item], item => item.label);
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
const labels = lodashMap([item], item => item.label);
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
const labels = map([item], item => item.label);
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
const activeUser = _.find([user], user => user.active);
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
const has = _.includes([item], value);
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

  it('uses type information to select shape-specific alternatives', () => {
    const ruleTester = new RuleTester();

    ruleTester.run('prefer-native-lodash-alternative', rule, {
      valid: [
        {
          code: `
import _ from 'lodash';
declare const items: unknown;
declare const value: unknown;
_.map(items, item => item);
_.includes(items, value);
`,
          languageOptions: { ecmaVersion: 2016 },
        },
        {
          code: `
import _ from 'lodash';
declare const users: Array<{ name: string }>;
const labels = _.map(users, 'name');
`,
        },
        {
          code: `
import _ from 'lodash';
declare const record: Record<string, { label: string }>;
const labels = _.map(record, value => value.label);
`,
        },
      ],
      invalid: [
        {
          code: `
import _ from 'lodash';
declare const users: Array<{ name: string }>;
const labels = _.map(users, user => user.name);
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
declare const users: string[];
declare const user: string;
declare const name: string;
const hasItem = _.includes(users, user);
const hasText = _.includes(name, 'x');
`,
          languageOptions: { ecmaVersion: 2016 },
          errors: [
            {
              message:
                'Consider Array.prototype.includes() instead of includes() from lodash; check that the behavior is equivalent because the library also accepts strings, objects, and nullish values.',
            },
            {
              message:
                'Consider String.prototype.includes() instead of includes() from lodash; check that the behavior is equivalent because the library also accepts arrays, objects, and nullish values.',
            },
          ],
        },
      ],
    });
  });
});
