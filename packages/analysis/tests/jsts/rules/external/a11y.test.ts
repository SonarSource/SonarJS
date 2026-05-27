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
import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  extractUpstreamRecommendedConfiguration,
  extractUpstreamRecommendedFields,
  getUpstreamRecommendedConfiguration,
} from '../../../../src/jsts/rules/external/a11y.js';

describe('jsx-a11y upstream recommended configuration', () => {
  test('should expose the installed recommended config for no-noninteractive-tabindex', () => {
    assert.deepStrictEqual(getUpstreamRecommendedConfiguration('no-noninteractive-tabindex'), {
      tags: [],
      roles: ['tabpanel'],
      allowExpressionValues: true,
    });
  });

  test('should expose an array-only recommended config for no-noninteractive-element-to-interactive-role', () => {
    assert.ok(
      Object.values(
        getUpstreamRecommendedConfiguration('no-noninteractive-element-to-interactive-role'),
      ).every(Array.isArray),
    );
  });

  test('should map supported recommended config values to Sonar fields', () => {
    assert.deepStrictEqual(
      extractUpstreamRecommendedFields(
        {
          configs: {
            recommended: {
              rules: {
                'jsx-a11y/no-static-element-interactions': [
                  'error',
                  {
                    allowExpressionValues: true,
                    handlers: [
                      'onClick',
                      'onMouseDown',
                      'onMouseUp',
                      'onKeyPress',
                      'onKeyDown',
                      'onKeyUp',
                    ],
                  },
                ],
              },
            },
          },
        },
        'no-static-element-interactions',
      ),
      [
        {
          field: 'allowExpressionValues',
          default: true,
        },
        {
          field: 'handlers',
          default: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
        },
      ],
    );
  });

  test('should fail clearly when the recommended config is missing', () => {
    assert.throws(
      () =>
        extractUpstreamRecommendedConfiguration(
          {
            configs: {
              recommended: {
                rules: {},
              },
            },
          },
          'interactive-supports-focus',
        ),
      /upstream recommended config.*not found/i,
    );
  });

  test('should fail clearly when the recommended config contains unsupported field types', () => {
    assert.throws(
      () =>
        extractUpstreamRecommendedConfiguration(
          {
            configs: {
              recommended: {
                rules: {
                  'jsx-a11y/no-static-element-interactions': [
                    'error',
                    {
                      allowExpressionValues: 'yes',
                    },
                  ],
                },
              },
            },
          },
          'no-static-element-interactions',
        ),
      /unsupported upstream recommended config/i,
    );
  });
});
