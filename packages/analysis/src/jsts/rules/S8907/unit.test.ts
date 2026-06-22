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
        {
          code: `
import _ from 'lodash';
const labels = _.map(items, item => item.label);
`,
          errors: [
            {
              message:
                'Consider Array.prototype.map() instead of Lodash map(); check that the behavior is equivalent because Lodash also accepts objects and nullish values.',
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
                'Consider Array.prototype.map() instead of Lodash map(); check that the behavior is equivalent because Lodash also accepts objects and nullish values.',
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
                'Consider Array.prototype.map() instead of Lodash map(); check that the behavior is equivalent because Lodash also accepts objects and nullish values.',
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
                'Consider Array.prototype.map() instead of Lodash map(); check that the behavior is equivalent because Lodash also accepts objects and nullish values.',
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
                'Consider Array.prototype.find() instead of Lodash find(); check that the behavior is equivalent because Lodash and Underscore also accept objects, nullish values, and shorthand predicates.',
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
                'Consider Object.keys() instead of Underscore keys(); check that the behavior is equivalent because Lodash and Underscore handle nullish values differently from the native API.',
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
                'Consider Set instead of Lodash uniq(); check that the behavior is equivalent because Lodash and Underscore handle nullish values differently from the native API.',
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
              message: 'Use Array.isArray() instead of Lodash isArray().',
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
                'Consider String.prototype.startsWith() instead of Lodash startsWith(); check that the behavior is equivalent because Lodash and Underscore coerce values and handle nullish values differently from the native API.',
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
                'Consider String.prototype.toLowerCase() instead of Underscore toLower(); check that the behavior is equivalent because Lodash and Underscore coerce values and handle nullish values differently from the native API.',
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
                'Consider Object.assign() instead of Lodash assign(); check that the behavior is equivalent because Lodash and Underscore handle nullish targets differently from Object.assign.',
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
                'Consider Number.isFinite() instead of Underscore isFinite(); check that the behavior is equivalent because Underscore coerces some values before checking them.',
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
              message: 'Use Number.isInteger() instead of Lodash isInteger().',
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
                'Consider Array.prototype.includes() instead of Lodash includes(); check that the behavior is equivalent because Lodash also accepts strings, objects, and nullish values.',
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
                'Consider Object.values() instead of Lodash values(); check that the behavior is equivalent because Lodash and Underscore handle nullish values differently from the native API.',
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
                'Consider Object.entries() instead of Lodash entries(); check that the behavior is equivalent because Lodash and Underscore handle nullish values differently from the native API.',
            },
            {
              message:
                'Consider String.prototype.padStart() instead of Lodash padStart(); check that the behavior is equivalent because Lodash and Underscore coerce values and handle nullish values differently from the native API.',
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
                'Consider Array.prototype.flat() instead of Lodash flatten(); check that the behavior is equivalent because Lodash handles nullish values differently from the native API.',
            },
          ],
        },
      ],
    });
  });
});
