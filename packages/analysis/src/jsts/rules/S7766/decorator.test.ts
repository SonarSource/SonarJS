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
import { decorate } from './decorator.js';
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import type { Rule } from 'eslint';

const conditionalExpressionRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Reports conditional expressions',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      ConditionalExpression(node) {
        context.report({
          node,
          message: 'reported conditional expression',
        });
      },
    };
  },
};

const programReportRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Reports the program',
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      Program() {
        context.report({
          loc: { line: 1, column: 0 },
          message: 'reported program',
        });
      },
    };
  },
};

describe('S7766 decorator', () => {
  it('forwards unrelated reports from the decorated rule', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Decorated rule', decorate(conditionalExpressionRule), {
      valid: [],
      invalid: [
        {
          code: 'const value = condition ? left : right;',
          errors: 1,
        },
        {
          code: 'const value = left === right ? left : right;',
          errors: 1,
        },
      ],
    });
  });

  it('forwards reports without nodes from the decorated rule', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Decorated rule', decorate(programReportRule), {
      valid: [],
      invalid: [
        {
          code: 'const value = condition ? left : right;',
          errors: 1,
        },
      ],
    });
  });

  it('suppresses only direct plain-JS object min/max reports from the decorated rule', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Decorated rule', decorate(conditionalExpressionRule), {
      valid: [
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

MomentLike.prototype.max = function (other) {
  return other > this ? this : other;
};
          `,
        },
        {
          code: `
function earliestDate(left, right) {
  return left < right ? left : right;
}

earliestDate(new Date(1), new Date(2));
          `,
        },
        {
          code: `
function lowerDomainValue(left, right) {
  return left < right ? left : right;
}

lowerDomainValue({ valueOf: () => 1 }, { valueOf: () => 2 });
          `,
        },
        {
          code: `
let lowerDomainValue;

lowerDomainValue = function (left, right) {
  return left < right ? left : right;
};

lowerDomainValue(new Date(1), new Date(2));
          `,
        },
        {
          code: `
const first = new Date(1);
const second = new Date(2);

const earliest = first < second ? first : second;
          `,
        },
        {
          code: `
function lowerDomainValue(left, right) {
  return left < right ? left : right;
}

lowerDomainValue({ 'valueOf': () => 1 }, { 'valueOf': () => 2 });
          `,
        },
        {
          code: `
const lowerDomainValue = (left, right) => left < right ? left : right;

lowerDomainValue({ valueOf: () => 1 }, { valueOf: () => 2 });
          `,
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
        },
        {
          code: `
function highestValue(values) {
  return values.reduce(
    (highest, current) => highest < current ? current : highest,
    { label: 'zero', valueOf: () => 0 },
  );
}

highestValue([
  { label: 'low', valueOf: () => 1 },
  { label: 'high', valueOf: () => 2 },
]);
          `,
        },
      ],
      invalid: [
        {
          code: `
function earliestTimestamp(firstDate, secondDate) {
  return firstDate < secondDate ? firstDate : secondDate;
}

earliestTimestamp(Date.now(), Date.now() + 1);
          `,
          errors: 1,
        },
        {
          code: `
function SomeType(value) {
  this.value = value;
}

SomeType.prototype.valueOf = function () {
  return this.value;
};

function clamp(value, upper) {
  return value > upper ? upper : value;
}

clamp(10, 5);
          `,
          errors: 1,
        },
        {
          code: `
const lowerDomainValue = (left, right) => left < right ? left : right;
const alias = lowerDomainValue;

lowerDomainValue({ valueOf: () => 1 }, { valueOf: () => 2 });
          `,
          errors: 1,
        },
        {
          code: `
const keepLatestDate = (left, right) => right;
let lowerDomainValue;

lowerDomainValue = function (left, right) {
  return left < right ? left : right;
};

lowerDomainValue = keepLatestDate;
lowerDomainValue(new Date(1), new Date(2));
          `,
          errors: 1,
        },
        {
          code: `
let left = new Date(1);
left = Date.now();
const right = Date.now() + 1;

const earliest = left < right ? left : right;
          `,
          errors: 1,
        },
        {
          code: `
function earliestValue(left, right) {
  left = Date.now();
  right = Date.now() + 1;
  return left < right ? left : right;
}

earliestValue(new Date(1), new Date(2));
          `,
          errors: 1,
        },
      ],
    });
  });

  it('reports typed unions with numeric constituents in the decorated rule', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Decorated rule', decorate(conditionalExpressionRule), {
      valid: [
        {
          code: `
type StringOrDate = string | Date;

function lowerStringOrDate(left: StringOrDate, right: StringOrDate): StringOrDate {
  return left < right ? left : right;
}
          `,
        },
        {
          code: `
type BrandedTimestamp = number & { readonly __brand: unique symbol };

declare function getTimestamp(value: number): BrandedTimestamp;

function earliestBrandedTimestamp(
  first: BrandedTimestamp,
  second: BrandedTimestamp,
): BrandedTimestamp {
  return first < second ? first : second;
}
          `,
        },
      ],
      invalid: [
        {
          code: `
type NumericOrDate = number | Date;

function earliestNumericOrDate(left: NumericOrDate, right: NumericOrDate): NumericOrDate {
  return left < right ? left : right;
}
          `,
          errors: 1,
        },
        {
          code: `
type NumericValue = 1 | 2 | 3;

function earliestNumericValue(left: NumericValue, right: NumericValue): NumericValue {
  return left < right ? left : right;
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
