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

const decimalLiteralPattern = /^(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/u;

export function isExactlyRepresentableAsBinaryFraction(raw: string) {
  const match = decimalLiteralPattern.exec(raw);
  if (!match) {
    return false;
  }

  const [, integerPart, fractionalPart = '', exponentPart] = match;
  const digits = `${integerPart}${fractionalPart}`;
  if (digits === '') {
    return false;
  }

  const exponent = Number(exponentPart ?? 0) - fractionalPart.length;
  const numerator = BigInt(digits);
  if (numerator === 0n || exponent >= 0) {
    return true;
  }

  const denominator = 10n ** BigInt(-exponent);
  const reducedDenominator = denominator / greatestCommonDivisor(numerator, denominator);
  return isPowerOfTwo(reducedDenominator);
}

export function isExactlyRepresentableIntegerDivision(leftValue: number, rightValue: number) {
  if (!Number.isSafeInteger(leftValue) || !Number.isSafeInteger(rightValue) || rightValue === 0) {
    return false;
  }
  const numerator = BigInt(Math.abs(leftValue));
  const denominator = BigInt(Math.abs(rightValue));
  const reducedDenominator = denominator / greatestCommonDivisor(numerator, denominator);
  return isPowerOfTwo(reducedDenominator);
}

export function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left;
  let b = right;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function isPowerOfTwo(value: bigint) {
  return value > 0n && (value & (value - 1n)) === 0n;
}
