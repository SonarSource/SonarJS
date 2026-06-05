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
import { decorate } from './decorator.js';
import { rules as externalRules } from '../external/unicorn.js';
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

const upstreamRule = externalRules['prefer-math-min-max'];

describe('S7766', () => {
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
      ],
    });
  });

  it('S7766 with type information', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Ternary expressions selecting min/max values should use Math.min/max', rule, {
      valid: [
        {
          code: `
function earliestDate(first: Date, second: Date): Date {
  return first < second ? first : second;
}

function latestDate(first: Date, second: Date): Date {
  return first > second ? first : second;
}
          `,
        },
        {
          code: `
interface MomentLike {
  isValid(): boolean;
  valueOf(): number;
}

function earliestMoment(first: MomentLike, second: MomentLike): MomentLike {
  return first < second ? first : second;
}

function latestMoment(first: MomentLike, second: MomentLike): MomentLike {
  return first > second ? first : second;
}
          `,
        },
        {
          code: `
function compareBooleans(left: boolean, right: boolean): boolean {
  return left < right ? left : right;
}
          `,
        },
        {
          code: `
function lowerDomainValue<T>(left: T, right: T): T {
  return left < right ? left : right;
}

function higherDomainValue<T>(left: T, right: T): T {
  return left > right ? left : right;
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
        {
          code: `
function lowerAnyConstraintValue<T extends any>(left: T, right: T): T {
  return left < right ? left : right;
}
          `,
        },
        {
          code: `
function lowerUnknownConstraintValue<T extends unknown>(left: T, right: T): T {
  return left < right ? left : right;
}
          `,
        },
      ],
      invalid: [
        {
          code: `
function clampHeight(height: number): number {
  return height > 50 ? 50 : height;
}
          `,
          output: `
function clampHeight(height: number): number {
  return Math.min(height, 50);
}
          `,
          errors: 1,
        },
        {
          code: `
function earliestTimestamp(firstDate: number, secondDate: number): number {
  return firstDate < secondDate ? firstDate : secondDate;
}
          `,
          output: `
function earliestTimestamp(firstDate: number, secondDate: number): number {
  return Math.min(firstDate, secondDate);
}
          `,
          errors: 1,
        },
      ],
    });
  });

  it('S7766 without type information', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Ternary expressions selecting min/max values should use Math.min/max', rule, {
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

function higherDomainValue(left, right) {
  return left > right ? left : right;
}

lowerDomainValue({ valueOf: () => 1 }, { valueOf: () => 2 });
higherDomainValue({ valueOf: () => 1 }, { valueOf: () => 2 });
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
          output: `
function earliestTimestamp(firstDate, secondDate) {
  return Math.min(firstDate, secondDate);
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
          output: `
function SomeType(value) {
  this.value = value;
}

SomeType.prototype.valueOf = function () {
  return this.value;
};

function clamp(value, upper) {
  return Math.min(value, upper);
}

clamp(10, 5);
          `,
          errors: 1,
        },
      ],
    });
  });
});
