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
import { rules as externalRules } from '../external/unicorn.js';
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import type { Rule } from 'eslint';

const upstreamRule = externalRules['prefer-math-min-max'] as Rule.RuleModule;

describe('S7766 upstream sentinel', () => {
  it('raw upstream already accepts the stale typed examples', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Raw unicorn rule', upstreamRule, {
      valid: [
        {
          code: `
function earliestDate(first: Date, second: Date): Date {
  return first < second ? first : second;
}
          `,
        },
        {
          code: `
function lowerDomainValue<T>(left: T, right: T): T {
  return left < right ? left : right;
}
          `,
        },
        {
          code: `
function lowerConstrainedValue<T extends { valueOf(): string }>(left: T, right: T): T {
  return left < right ? left : right;
}
          `,
        },
      ],
      invalid: [],
    });
  });

  it('raw upstream still reports the live typed non-number cases', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Raw unicorn rule', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `
interface MomentLike {
  valueOf(): number;
  format(): string;
}

declare function getMoment(value: number): MomentLike;

const first = getMoment(1);
const second = getMoment(2);

const earliest = first < second ? first : second;
          `,
          output: `
interface MomentLike {
  valueOf(): number;
  format(): string;
}

declare function getMoment(value: number): MomentLike;

const first = getMoment(1);
const second = getMoment(2);

const earliest = Math.min(first, second);
          `,
          errors: 1,
        },
        {
          code: `
function maxReducer<T>(comparer?: (x: T, y: T) => number) {
  const max: (x: T, y: T) => T =
    typeof comparer === 'function'
      ? (x, y) => comparer(x, y) > 0 ? x : y
      : (x, y) => x > y ? x : y;
  return max;
}
          `,
          output: `
function maxReducer<T>(comparer?: (x: T, y: T) => number) {
  const max: (x: T, y: T) => T =
    typeof comparer === 'function'
      ? (x, y) => comparer(x, y) > 0 ? x : y
      : (x, y) => Math.max(x, y);
  return max;
}
          `,
          errors: 1,
        },
      ],
    });
  });

  it('raw upstream still reports the remaining plain-JS object cases', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Raw unicorn rule', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `
function MomentLike(value) {
  this.value = value;
}

MomentLike.prototype.valueOf = function () {
  return this.value;
};

MomentLike.prototype.min = function (other) {
  return other < this ? this : other;
};
          `,
          output: `
function MomentLike(value) {
  this.value = value;
}

MomentLike.prototype.valueOf = function () {
  return this.value;
};

MomentLike.prototype.min = function (other) {
  return Math.max(other, this);
};
          `,
          errors: 1,
        },
        {
          code: `
function earliestDate(left, right) {
  return left < right ? left : right;
}

earliestDate(new Date(1), new Date(2));
          `,
          output: `
function earliestDate(left, right) {
  return Math.min(left, right);
}

earliestDate(new Date(1), new Date(2));
          `,
          errors: 1,
        },
        {
          code: `
function lowerDomainValue(left, right) {
  return left < right ? left : right;
}

lowerDomainValue({ valueOf: () => 1 }, { valueOf: () => 2 });
          `,
          output: `
function lowerDomainValue(left, right) {
  return Math.min(left, right);
}

lowerDomainValue({ valueOf: () => 1 }, { valueOf: () => 2 });
          `,
          errors: 1,
        },
        {
          code: `
function latestDate(dates) {
  return dates.reduce(
    (latest, current) => latest < current ? current : latest,
    new Date(0),
  );
}

latestDate([new Date(1), new Date(2)]);
          `,
          output: `
function latestDate(dates) {
  return dates.reduce(
    (latest, current) => Math.max(latest, current),
    new Date(0),
  );
}

latestDate([new Date(1), new Date(2)]);
          `,
          errors: 1,
        },
        {
          code: `
const values = [
  { label: 'low', valueOf: () => 1 },
  { label: 'high', valueOf: () => 2 },
];

const highest = values.reduce(
  (highest, current) => highest < current ? current : highest,
  { label: 'zero', valueOf: () => 0 },
);
          `,
          output: `
const values = [
  { label: 'low', valueOf: () => 1 },
  { label: 'high', valueOf: () => 2 },
];

const highest = values.reduce(
  (highest, current) => Math.max(highest, current),
  { label: 'zero', valueOf: () => 0 },
);
          `,
          errors: 1,
        },
      ],
    });
  });
});
