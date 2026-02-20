/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { StylelintRuleTester } from '../../../tests/tools/tester/index.js';
import { rule, messages, getAngle } from './rule.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import type postcssValueParser from 'postcss-value-parser';

const ruleTester = new StylelintRuleTester(rule.ruleName);
describe('S7923', () => {
  it('detects valid angle with rotateZ', () =>
    ruleTester.valid({
      codeFilename: 'noRestriction.html',
      code: `
<html lang="en">
	<head>
		<style>
			@media (orientation: portrait) {
				html {
					transform: rotateZ(1turn);
				}
			}
		</style>
	</head>
</html>`,
    }));

  it('detects valid angle with matrix', () =>
    ruleTester.valid({
      codeFilename: 'noRestriction.html',
      code: `
<html lang="en">
	<head>
		<style>
			@media (orientation: portrait) {
				html {
					transform: matrix(1, -1.22465e-15, 1.22465e-15, 1, 0, 0);
				}
			}
		</style>
	</head>
</html>`,
    }));

  it('restricts the element to landscape orientation with rotate', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<style>
			@media (orientation: portrait) {
				html {
					transform: rotate(1.5708rad);
				}
			}
		</style>
	</head>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 7 }],
    }));

  it('restricts the element to landscape orientation with rotate3d', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<style>
			@media (orientation: portrait) {
				html {
					transform: rotate3d(0, 0, 1, 90deg);
				}
			}
		</style>
	</head>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 7 }],
    }));

  it('restricts the element to landscape orientation with matrix3d', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<style>
			@media (orientation: landscape) {
				body {
					transform: matrix3d(0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
				}
			}
		</style>
	</head>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 7 }],
    }));

  it('restricts the element to landscape orientation with rotate with tolerance', () =>
    ruleTester.invalid({
      codeFilename: 'restricted.html',
      code: `
<html lang="en">
	<head>
		<style>
			body {
				transform: rotate(2.5deg);
			}

			@media (orientation: landscape) {
				body {
					transform: rotate(92.5deg);
				}
			}
		</style>
	</head>
</html>`,
      errors: [{ text: `${messages.locked} (sonar/no-restrict-orientation)`, line: 11 }],
    }));
});

describe('getAngle', () => {
  // Helper function to create postcss nodes for testing
  const createFunctionNode = (
    functionName: string,
    params: string[],
  ): postcssValueParser.FunctionNode => {
    const nodes = params.map(param => ({
      type: 'word' as const,
      value: param,
      sourceIndex: 0,
      sourceEndIndex: param.length,
    }));

    return {
      type: 'function' as const,
      value: functionName,
      nodes,
      sourceIndex: 0,
      sourceEndIndex: functionName.length,
      before: '',
      after: '',
    };
  };

  const createWordNode = (value: string): postcssValueParser.WordNode => ({
    type: 'word' as const,
    value,
    sourceIndex: 0,
    sourceEndIndex: value.length,
  });

  describe('rotate function', () => {
    it('should extract angle from rotate function with degrees', () => {
      const node = createFunctionNode('rotate', ['90deg']);
      expect(getAngle(node)).toBe(90);
    });

    it('should extract angle from rotate function with negative degrees', () => {
      const node = createFunctionNode('rotate', ['-45deg']);
      expect(getAngle(node)).toBe(315); // normalized to 0-360 range
    });

    it('should extract angle from rotate function with radians', () => {
      const node = createFunctionNode('rotate', ['1.5708rad']); // π/2 radians = 90 degrees
      expect(getAngle(node)).toBeCloseTo(90, 1);
    });

    it('should extract angle from rotate function with gradians', () => {
      const node = createFunctionNode('rotate', ['100grad']); // 100 gradians = 90 degrees
      expect(getAngle(node)).toBe(90);
    });

    it('should extract angle from rotate function with turns', () => {
      const node = createFunctionNode('rotate', ['0.25turn']); // 0.25 turn = 90 degrees
      expect(getAngle(node)).toBe(90);
    });

    it('should handle decimal angles', () => {
      const node = createFunctionNode('rotate', ['45.5deg']);
      expect(getAngle(node)).toBe(45.5);
    });

    it('should be case insensitive for rotate function name', () => {
      const node = createFunctionNode('ROTATE', ['90deg']);
      expect(getAngle(node)).toBe(90);
    });

    it('should return undefined for rotate with multiple parameters', () => {
      const node = createFunctionNode('rotate', ['90deg', '45deg']);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should return undefined for rotate with invalid angle format', () => {
      const node = createFunctionNode('rotate', ['invalid']);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should return undefined for rotate with no parameters', () => {
      const node = createFunctionNode('rotate', []);
      expect(getAngle(node)).toBeUndefined();
    });
  });

  describe('rotateZ function', () => {
    it('should extract angle from rotateZ function', () => {
      const node = createFunctionNode('rotatez', ['270deg']);
      expect(getAngle(node)).toBe(270);
    });

    it('should be case insensitive for rotateZ function name', () => {
      const node = createFunctionNode('ROTATEZ', ['180deg']);
      expect(getAngle(node)).toBe(180);
    });
  });

  describe('rotate3d function', () => {
    it('should extract angle from valid rotate3d function (z-axis rotation)', () => {
      const node = createFunctionNode('rotate3d', ['0', '0', '1', '90deg']);
      expect(getAngle(node)).toBe(90);
    });

    it('should return undefined for rotate3d with x or y axis rotation', () => {
      const node = createFunctionNode('rotate3d', ['1', '0', '0', '90deg']);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should return undefined for rotate3d with combined axis rotation', () => {
      const node = createFunctionNode('rotate3d', ['1', '1', '1', '90deg']);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should return undefined for rotate3d with wrong number of parameters', () => {
      const node = createFunctionNode('rotate3d', ['0', '0', '1']);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should handle negative z-axis value', () => {
      const node = createFunctionNode('rotate3d', ['0', '0', '-1', '90deg']);
      expect(getAngle(node)).toBe(90);
    });

    it('should handle different z-axis values (non-zero)', () => {
      const node = createFunctionNode('rotate3d', ['0', '0', '2', '45deg']);
      expect(getAngle(node)).toBe(45);
    });
  });

  describe('matrix function', () => {
    it('should extract 90 degree angle from matrix', () => {
      // matrix(cos(90°), sin(90°), -sin(90°), cos(90°), tx, ty) = matrix(0, 1, -1, 0, tx, ty)
      const node = createFunctionNode('matrix', ['0', '1', '-1', '0', '0', '0']);
      expect(getAngle(node)).toBeCloseTo(90, 1);
    });

    it('should extract 270 degree angle from matrix', () => {
      // matrix(cos(270°), sin(270°), -sin(270°), cos(270°), tx, ty) = matrix(0, -1, 1, 0, tx, ty)
      const node = createFunctionNode('matrix', ['0', '-1', '1', '0', '0', '0']);
      expect(getAngle(node)).toBeCloseTo(270, 1);
    });

    it('should extract 45 degree angle from matrix', () => {
      const cos45 = Math.cos(Math.PI / 4).toString();
      const sin45 = Math.sin(Math.PI / 4).toString();
      const node = createFunctionNode('matrix', [cos45, sin45, `-${sin45}`, cos45, '0', '0']);
      expect(getAngle(node)).toBeCloseTo(45, 1);
    });

    it('should return undefined for matrix with wrong number of parameters', () => {
      const node = createFunctionNode('matrix', ['0', '1', '-1', '0', '0']);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should handle identity matrix (0 degrees)', () => {
      const node = createFunctionNode('matrix', ['1', '0', '0', '1', '0', '0']);
      expect(getAngle(node)).toBe(0);
    });
  });

  describe('matrix3d function', () => {
    it('should extract 90 degree angle from matrix3d', () => {
      // 90°: matrix3d(0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
      const node = createFunctionNode('matrix3d', [
        '0',
        '1',
        '0',
        '0',
        '-1',
        '0',
        '0',
        '0',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
        '1',
      ]);
      expect(getAngle(node)).toBeCloseTo(90, 1);
    });

    it('should extract 270 degree angle from matrix3d', () => {
      // 270°: matrix3d(0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
      const node = createFunctionNode('matrix3d', [
        '0',
        '-1',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
        '1',
      ]);
      expect(getAngle(node)).toBeCloseTo(270, 1);
    });

    it('should return undefined for matrix3d with wrong number of parameters', () => {
      const node = createFunctionNode('matrix3d', [
        '0',
        '1',
        '0',
        '0',
        '-1',
        '0',
        '0',
        '0',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
      ]);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should handle identity matrix3d (0 degrees)', () => {
      const node = createFunctionNode('matrix3d', [
        '1',
        '0',
        '0',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
        '1',
        '0',
        '0',
        '0',
        '0',
        '1',
      ]);
      expect(getAngle(node)).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return undefined for non-function nodes', () => {
      const wordNode = createWordNode('90deg');
      expect(getAngle(wordNode)).toBeUndefined();
    });

    it('should return undefined for unsupported function names', () => {
      const node = createFunctionNode('scale', ['2']);
      expect(getAngle(node)).toBeUndefined();
    });

    it('should handle angle normalization correctly', () => {
      const node = createFunctionNode('rotate', ['450deg']); // 450° should normalize to 90°
      expect(getAngle(node)).toBe(90);
    });

    it('should handle large negative angles', () => {
      const node = createFunctionNode('rotate', ['-270deg']); // -270° should normalize to 90°
      expect(getAngle(node)).toBe(90);
    });

    it('should handle very small angles', () => {
      const node = createFunctionNode('rotate', ['0.1deg']);
      expect(getAngle(node)).toBeCloseTo(0.1);
    });

    it('should handle angles with spaces', () => {
      const node = createFunctionNode('rotate', [' 90deg ']);
      expect(getAngle(node)).toBe(90);
    });
  });

  describe('angle normalization', () => {
    it('should normalize angles to 0-360 range', () => {
      const testCases = [
        { input: '450deg', expected: 90 },
        { input: '-90deg', expected: 270 },
        { input: '720deg', expected: 0 },
        { input: '-900', expected: 180 },
        { input: '1080deg', expected: 0 },
      ];

      testCases.forEach(({ input, expected }) => {
        const node = createFunctionNode('rotate', [input]);
        expect(getAngle(node)).toBe(expected);
      });
    });
  });
});
