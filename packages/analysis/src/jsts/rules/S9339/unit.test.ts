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
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';

const ALL_MESSAGE =
  'axios.all() is a deprecated Axios helper; Promise.all() is the native equivalent.';
const SPREAD_MESSAGE =
  'axios.spread() is a deprecated Axios helper; array destructuring is the native equivalent.';
const CANCEL_MESSAGE =
  'CancelToken is a deprecated Axios API; AbortController is the standard cancellation mechanism.';

describe('S9339', () => {
  it('reports deprecated Axios helpers and CancelToken', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('prefer-native-axios-alternative', rule, {
      valid: [
        {
          code: `
import axios from 'axios';
axios.get('/a');
axios.post('/a', data);
axios.create({ baseURL: '/api' });
axios.isCancel(error);
`,
        },
        {
          code: `
import axios from 'axios';
axios.create({ cancelToken: source.token });
`,
        },
        {
          code: `
import axios from 'axios';
axios.post('/jobs', { cancelToken: job.cancelToken });
axios.put('/jobs/1', { cancelToken: job.cancelToken });
axios.patch('/jobs/1', { cancelToken: job.cancelToken });
`,
        },
        {
          code: `
import axios from 'axios';
axios.get({ cancelToken: source.token });
`,
        },
        {
          code: `
const client = { all(values) { return values; } };
client.all([1, 2]);
`,
        },
        {
          code: `
import axios from 'axios';
axios['all']([axios.get('/a')]);
axios['spread'](handler);
axios['CancelToken'].source();
`,
        },
        {
          code: `
const config = { cancelToken: source.token };
doRequest(config);
`,
        },
        {
          code: `
import ky from 'ky';
ky.get('/a');
`,
        },
      ],
      invalid: [
        {
          code: `
import axios from 'axios';
axios.all([axios.get('/a'), axios.get('/b')]);
`,
          errors: [
            {
              message: ALL_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.all() with Promise.all().',
                  output: `
import axios from 'axios';
Promise.all([axios.get('/a'), axios.get('/b')]);
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import axios from 'axios';
Promise.all([axios.get('/a'), axios.get('/b')])
  .then(axios.spread((a, b) => {
    console.log(a.data, b.data);
  }));
`,
          errors: [
            {
              message: SPREAD_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.spread() with array destructuring.',
                  output: `
import axios from 'axios';
Promise.all([axios.get('/a'), axios.get('/b')])
  .then((([a, b]) => {
    console.log(a.data, b.data);
  }));
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import axios from 'axios';
const source = axios.CancelToken.source();
axios.get('/user', { cancelToken: source.token });
source.cancel();
`,
          errors: [
            { message: CANCEL_MESSAGE },
            { message: CANCEL_MESSAGE },
          ],
        },
        {
          code: `
import axios from 'axios';
axios.post('/jobs', payload, { cancelToken: source.token });
axios.put('/jobs/1', payload, { cancelToken: source.token });
axios.patch('/jobs/1', payload, { cancelToken: source.token });
axios.request({ url: '/user', cancelToken: source.token });
`,
          errors: [
            { message: CANCEL_MESSAGE },
            { message: CANCEL_MESSAGE },
            { message: CANCEL_MESSAGE },
            { message: CANCEL_MESSAGE },
          ],
        },
        {
          code: `
import { all, spread, CancelToken } from 'axios';
all([one, two]);
spread((left, right) => left + right);
CancelToken.source();
new CancelToken(cancel => {});
`,
          errors: [
            {
              message: ALL_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.all() with Promise.all().',
                  output: `
import { all, spread, CancelToken } from 'axios';
Promise.all([one, two]);
spread((left, right) => left + right);
CancelToken.source();
new CancelToken(cancel => {});
`,
                },
              ],
            },
            {
              message: SPREAD_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.spread() with array destructuring.',
                  output: `
import { all, spread, CancelToken } from 'axios';
all([one, two]);
(([left, right]) => (left + right));
CancelToken.source();
new CancelToken(cancel => {});
`,
                },
              ],
            },
            { message: CANCEL_MESSAGE },
            { message: CANCEL_MESSAGE },
          ],
        },
        {
          code: `
const axios = require('axios');
axios.all([one]);
`,
          errors: [
            {
              message: ALL_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.all() with Promise.all().',
                  output: `
const axios = require('axios');
Promise.all([one]);
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import * as axios from 'axios';
axios.all([one]);
`,
          errors: [
            {
              message: ALL_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.all() with Promise.all().',
                  output: `
import * as axios from 'axios';
Promise.all([one]);
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import axios from 'axios';
const CancelToken = axios.CancelToken;
`,
          errors: [{ message: CANCEL_MESSAGE }],
        },
        {
          code: `
import axios from 'axios';
axios({ url: '/user', cancelToken: source.token });
`,
          errors: [{ message: CANCEL_MESSAGE }],
        },
        {
          code: `
import axios from 'axios';
axios.spread(handler);
`,
          errors: [{ message: SPREAD_MESSAGE, suggestions: [] }],
        },
        {
          code: `
import axios from 'axios';
axios.spread(function (left, right) { return left + right; });
`,
          errors: [{ message: SPREAD_MESSAGE, suggestions: [] }],
        },
        {
          code: `
import axios from 'axios';
axios.spread((a, b) => ({ a, b }));
`,
          errors: [
            {
              message: SPREAD_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.spread() with array destructuring.',
                  output: `
import axios from 'axios';
(([a, b]) => ({ a, b }));
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import axios from 'axios';
fallback || axios.spread((a, b) => a);
`,
          errors: [
            {
              message: SPREAD_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.spread() with array destructuring.',
                  output: `
import axios from 'axios';
fallback || (([a, b]) => (a));
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import axios from 'axios';
axios.spread((a, b) => a + b)(pair);
`,
          errors: [
            {
              message: SPREAD_MESSAGE,
              suggestions: [
                {
                  desc: 'Replace axios.spread() with array destructuring.',
                  output: `
import axios from 'axios';
(([a, b]) => (a + b))(pair);
`,
                },
              ],
            },
          ],
        },
        {
          code: `
import axios from 'axios';
const Promise = {};
axios.all([one]);
`,
          errors: [{ message: ALL_MESSAGE, suggestions: [] }],
        },
      ],
    });
  });

  it('does not suggest rewriting spread callbacks that carry type syntax', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('prefer-native-axios-alternative', rule, {
      valid: [],
      invalid: [
        {
          code: `
import axios from 'axios';
axios.spread((left, right): number => left + right);
`,
          errors: [{ message: SPREAD_MESSAGE, suggestions: [] }],
        },
        {
          code: `
import axios from 'axios';
axios.spread(function (left, right): number { return left + right; });
`,
          errors: [{ message: SPREAD_MESSAGE, suggestions: [] }],
        },
        {
          code: `
import axios from 'axios';
axios.spread(<T,>(a, b) => convert<T>(a));
`,
          errors: [{ message: SPREAD_MESSAGE, suggestions: [] }],
        },
      ],
    });
  });
});
