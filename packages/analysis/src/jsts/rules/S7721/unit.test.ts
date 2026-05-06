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
import { rule } from './index.js';
import { rules } from '../external/unicorn.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const options = [{ checkArrowFunctions: false }];
const upstreamRule = rules['consistent-function-scoping'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S7721 upstream sentinel', () => {
  it('upstream consistent-function-scoping raises on ancestor captures that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('consistent-function-scoping', upstreamRule, {
      valid: [],
      invalid: [
        {
          // Ancestor parameter capture: suppressed by decorator, raised by upstream
          code: `
function buildSharedValueReader(sharedValue) {
  function createReader() {
    function readSharedValue() {
      return sharedValue.trim();
    }

    return readSharedValue;
  }

  return createReader();
}
          `,
          options,
          errors: 1,
        },
        {
          // Ancestor local variable capture: suppressed by decorator, raised by upstream
          code: `
function makeScopedFormatter(options) {
  const prefix = options.prefix.toUpperCase();

  function createFormatter() {
    const formatScopedLabel = function (suffix) {
      return \`\${prefix}-\${suffix}\`;
    };

    return formatScopedLabel;
  }

  return createFormatter();
}
          `,
          options,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7721', () => {
  it('S7721', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('consistent-function-scoping', rule, {
      valid: [
        {
          // Compliant: ancestor parameter
          code: `
function buildSharedValueReader(sharedValue) {
  function createReader() {
    function readSharedValue() {
      return sharedValue.trim();
    }

    return readSharedValue;
  }

  return createReader();
}
          `,
          options,
        },
        {
          // Compliant: ancestor variable
          code: `
function makeScopedFormatter(options) {
  const prefix = options.prefix.toUpperCase();

  function createFormatter() {
    const formatScopedLabel = function (suffix) {
      return \`\${prefix}-\${suffix}\`;
    };

    return formatScopedLabel;
  }

  return createFormatter();
}
          `,
          options,
        },
        {
          // Compliant: descendant read
          code: `
function makeReader(sharedValue) {
  function createReader() {
    function readSharedValue() {
      function normalize() {
        return sharedValue.trim();
      }

      return normalize();
    }

    return readSharedValue;
  }

  return createReader();
}
          `,
          options,
        },
      ],
      invalid: [
        {
          // Uses only its own parameter
          code: `
function createNormalizer() {
  function normalize(value) {
    return value.trim();
  }

  return normalize;
}
          `,
          options,
          errors: 1,
        },
        {
          // Module-scope capture
          code: `
const separator = '-';

function createJoiner() {
  function join(left, right) {
    return \`\${left}\${separator}\${right}\`;
  }

  return join;
}
          `,
          options,
          errors: 1,
        },
      ],
    });
  });
});
