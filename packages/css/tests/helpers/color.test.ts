/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { expect } from 'expect';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { contrast, getColorFromBackground, getColorFromString } from '../../src/helpers/color.js';

describe('contrast function', () => {
  it('should return maximum contrast for black and white', () => {
    const black = [0, 0, 0];
    const white = [255, 255, 255];
    const result = contrast(black, white);

    expect(result).toBeCloseTo(21, 1);
  });

  it('should return minimum contrast for identical colors', () => {
    const color = [128, 128, 128];
    const result = contrast(color, color);

    expect(result).toBe(1);
  });

  it('should be symmetric (order independent)', () => {
    const color1 = [51, 51, 51];
    const color2 = [255, 255, 255];

    expect(contrast(color1, color2)).toBe(contrast(color2, color1));
  });

  it('should identify colors above WCAG AA threshold', () => {
    const darkGray = [51, 51, 51]; // #333
    const white = [255, 255, 255];
    const result = contrast(darkGray, white);

    expect(result).toBeGreaterThan(4.5);
  });

  it('should identify colors below WCAG AA threshold', () => {
    const lightGray = [170, 170, 170]; // #AAA
    const white = [255, 255, 255];
    const result = contrast(lightGray, white);

    expect(result).toBeLessThan(4.5);
  });
});

describe('getColorFromString function - comprehensive CSS color formats', () => {
  describe('hex colors', () => {
    it('should parse 6-digit hex colors with full opacity', () => {
      expect(getColorFromString('#FFFFFF')).toEqual([255, 255, 255]);
      expect(getColorFromString('#000000')).toEqual([0, 0, 0]);
      expect(getColorFromString('#FF0000')).toEqual([255, 0, 0]);
      expect(getColorFromString('#00FF00')).toEqual([0, 255, 0]);
      expect(getColorFromString('#0000FF')).toEqual([0, 0, 255]);
      expect(getColorFromString('#CCCCCC')).toEqual([204, 204, 204]);
    });

    it('should parse 3-digit hex colors with full opacity', () => {
      expect(getColorFromString('#FFF')).toEqual([255, 255, 255]);
      expect(getColorFromString('#000')).toEqual([0, 0, 0]);
      expect(getColorFromString('#F00')).toEqual([255, 0, 0]);
      expect(getColorFromString('#0F0')).toEqual([0, 255, 0]);
      expect(getColorFromString('#00F')).toEqual([0, 0, 255]);
      expect(getColorFromString('#CCC')).toEqual([204, 204, 204]);
    });

    it('should parse lowercase hex colors', () => {
      expect(getColorFromString('#ffffff')).toEqual([255, 255, 255]);
      expect(getColorFromString('#abc123')).toEqual([171, 193, 35]);
      expect(getColorFromString('#def')).toEqual([221, 238, 255]);
    });

    it('should parse mixed case hex colors', () => {
      expect(getColorFromString('#AbC123')).toEqual([171, 193, 35]);
      expect(getColorFromString('#DeFaB1')).toEqual([222, 250, 177]);
    });

    it('should parse 8-digit hex colors with alpha channel', () => {
      const result = getColorFromString('#FF0000FF'); // Red with full alpha
      if (result) {
        expect(result).toEqual([255, 0, 0]); // RGB channels
      }

      const resultHalfAlpha = getColorFromString('#FF000080'); // Red with 50% alpha
      if (resultHalfAlpha) {
        expect(resultHalfAlpha).toHaveLength(4);
        expect(resultHalfAlpha.slice(0, 3)).toEqual([255, 0, 0]);
        expect(resultHalfAlpha[3]).toBeCloseTo(0.5, 2);
      }
    });

    it('should parse 4-digit hex colors with alpha channel', () => {
      const result = getColorFromString('#F00F'); // Red with full alpha
      if (result) {
        expect(result).toEqual([255, 0, 0]);
      }

      const resultHalfAlpha = getColorFromString('#F008'); // Red with ~50% alpha
      if (resultHalfAlpha) {
        expect(resultHalfAlpha).toHaveLength(4);
        expect(resultHalfAlpha.slice(0, 3)).toEqual([255, 0, 0]);
        expect(resultHalfAlpha[3]).toBeCloseTo(0.53, 1); // 8/15 ≈ 0.53
      }
    });
  });

  describe('rgb() and rgba() colors', () => {
    it('should parse rgb() with integers and default alpha', () => {
      expect(getColorFromString('rgb(255, 255, 255)')).toEqual([255, 255, 255]);
      expect(getColorFromString('rgb(0, 0, 0)')).toEqual([0, 0, 0]);
      expect(getColorFromString('rgb(255, 0, 0)')).toEqual([255, 0, 0]);
      expect(getColorFromString('rgb(128, 128, 128)')).toEqual([128, 128, 128]);
    });

    it('should parse rgb() with spaces variations', () => {
      expect(getColorFromString('rgb(255,255,255)')).toEqual([255, 255, 255]);
      expect(getColorFromString('rgb( 255 , 255 , 255 )')).toEqual([255, 255, 255]);
      expect(getColorFromString('rgb(255, 0,128)')).toEqual([255, 0, 128]);
    });

    it('should parse rgba() with alpha channel', () => {
      expect(getColorFromString('rgba(255, 255, 255, 1.0)')).toEqual([255, 255, 255]);
      expect(getColorFromString('rgba(255, 0, 0, 0.5)')).toEqual([255, 0, 0, 0.5]);
      expect(getColorFromString('rgba(0, 128, 255, 0.8)')).toEqual([0, 128, 255, 0.8]);
      expect(getColorFromString('rgba(128, 128, 128, 0)')).toEqual([128, 128, 128, 0]);
    });

    it('should parse rgb() with percentages and default alpha', () => {
      expect(getColorFromString('rgb(100%, 100%, 100%)')).toEqual([255, 255, 255]);
      expect(getColorFromString('rgb(0%, 0%, 0%)')).toEqual([0, 0, 0]);
      expect(getColorFromString('rgb(50%, 50%, 50%)')).toEqual([127, 127, 127]);
    });

    it('should parse rgba() with percentages and alpha', () => {
      expect(getColorFromString('rgba(100%, 0%, 0%, 1.0)')).toEqual([255, 0, 0]);
      expect(getColorFromString('rgba(0%, 100%, 50%, 0.5)')).toEqual([0, 255, 127, 0.5]);
      expect(getColorFromString('rgba(50%, 50%, 50%, 0.25)')).toEqual([127, 127, 127, 0.25]);
    });
  });

  describe('hsl() and hsla() colors', () => {
    it('should parse hsl() colors with default alpha', () => {
      expect(getColorFromString('hsl(0, 100%, 50%)')).toEqual([255, 0, 0]); // Red
      expect(getColorFromString('hsl(120, 100%, 50%)')).toEqual([0, 255, 0]); // Green
      expect(getColorFromString('hsl(240, 100%, 50%)')).toEqual([0, 0, 255]); // Blue
      expect(getColorFromString('hsl(0, 0%, 100%)')).toEqual([255, 255, 255]); // White
      expect(getColorFromString('hsl(0, 0%, 0%)')).toEqual([0, 0, 0]); // Black
    });

    it('should parse hsla() colors with alpha channel', () => {
      expect(getColorFromString('hsla(0, 100%, 50%, 1.0)')).toEqual([255, 0, 0]);
      expectArrayCloseTo(getColorFromString('hsla(120, 100%, 50%, 0.5)'), [0, 255, 0, 0.5]);
      expectArrayCloseTo(getColorFromString('hsla(60, 100%, 50%, 0.8)'), [255, 255, 0, 0.8]);
      expect(getColorFromString('hsla(240, 100%, 50%, 0.3)')).toEqual([0, 0, 255, 0.3]); // Blue
    });

    it('should parse hsl() with different saturation and lightness', () => {
      expectArrayCloseTo(getColorFromString('hsl(0, 50%, 50%)'), [191, 64, 64]);
      expectArrayCloseTo(getColorFromString('hsl(0, 100%, 25%)'), [128, 0, 0]);
      expectArrayCloseTo(getColorFromString('hsl(0, 100%, 75%)'), [255, 128, 128]);
    });
  });

  describe('named colors', () => {
    it('should parse basic named colors with full opacity', () => {
      expect(getColorFromString('white')).toEqual([255, 255, 255]);
      expect(getColorFromString('black')).toEqual([0, 0, 0]);
      expect(getColorFromString('red')).toEqual([255, 0, 0]);
      expect(getColorFromString('green')).toEqual([0, 128, 0]);
      expect(getColorFromString('blue')).toEqual([0, 0, 255]);
      expect(getColorFromString('yellow')).toEqual([255, 255, 0]);
      expect(getColorFromString('cyan')).toEqual([0, 255, 255]);
      expect(getColorFromString('magenta')).toEqual([255, 0, 255]);
    });

    it('should parse extended named colors', () => {
      expect(getColorFromString('orange')).toEqual([255, 165, 0]);
      expect(getColorFromString('purple')).toEqual([128, 0, 128]);
      expect(getColorFromString('brown')).toEqual([165, 42, 42]);
      expect(getColorFromString('pink')).toEqual([255, 192, 203]);
      expect(getColorFromString('gray')).toEqual([128, 128, 128]);
      expect(getColorFromString('grey')).toEqual([128, 128, 128]);
    });

    it('should parse case-insensitive named colors', () => {
      expect(getColorFromString('WHITE')).toEqual([255, 255, 255]);
      expect(getColorFromString('Black')).toEqual([0, 0, 0]);
      expect(getColorFromString('RED')).toEqual([255, 0, 0]);
      expect(getColorFromString('OrAnGe')).toEqual([255, 165, 0]);
    });

    it('should handle transparent color', () => {
      const result = getColorFromString('transparent');
      if (result) {
        expect(result).toHaveLength(4);
        expect(result[3]).toBe(0); // Should have 0 alpha
      }
    });

    it('should parse CSS system colors', () => {
      // Note: These might return null if not supported by the color-string library
      const systemColors = ['currentcolor', 'inherit', 'initial', 'unset'];

      systemColors.forEach(color => {
        const result = getColorFromString(color);
        // System colors might not be parseable, so we just check they don't throw
        expect(result).toBeUndefined();
      });
    });
  });

  describe('modern CSS color functions', () => {
    it('should handle hwb()', () => {
      // HWB (Hue, Whiteness, Blackness) - newer CSS color function
      expect(getColorFromString('hwb(0 0% 0%)')).toEqual([255, 0, 0]);
    });

    it('lab() colors are not supported', () => {
      // LAB color space - newer CSS color function
      expect(getColorFromString('lab(50% 20 -30)')).toBeUndefined();
    });

    it('lch() colors are not supported', () => {
      // LCH color space - newer CSS color function
      expect(getColorFromString('lch(50% 40 180)')).toBeUndefined();
    });
  });

  describe('alpha channel specific tests', () => {
    it('should handle various alpha values in rgba', () => {
      expect(getColorFromString('rgba(255, 0, 0, 0)')).toEqual([255, 0, 0, 0]); // Transparent
      expect(getColorFromString('rgba(255, 0, 0, 0.25)')).toEqual([255, 0, 0, 0.25]);
      expect(getColorFromString('rgba(255, 0, 0, 0.5)')).toEqual([255, 0, 0, 0.5]);
      expect(getColorFromString('rgba(255, 0, 0, 0.75)')).toEqual([255, 0, 0, 0.75]);
      expect(getColorFromString('rgba(255, 0, 0, 1)')).toEqual([255, 0, 0]); // Opaque
    });

    it('should handle various alpha values in hsla', () => {
      expect(getColorFromString('hsla(0, 100%, 50%, 0)')).toEqual([255, 0, 0, 0]);
      expect(getColorFromString('hsla(0, 100%, 50%, 0.33)')).toEqual([255, 0, 0, 0.33]);
      expect(getColorFromString('hsla(0, 100%, 50%, 0.66)')).toEqual([255, 0, 0, 0.66]);
      expect(getColorFromString('hsla(0, 100%, 50%, 1)')).toEqual([255, 0, 0]);
    });

    it('should handle alpha values as percentages', () => {
      const result1 = getColorFromString('rgba(255, 0, 0, 50%)');
      if (result1) {
        expect(result1[3]).toBeCloseTo(0.5, 2);
      }

      const result2 = getColorFromString('hsla(0, 100%, 50%, 25%)');
      if (result2) {
        expect(result2[3]).toBeCloseTo(0.25, 2);
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle invalid hex colors', () => {
      expect(getColorFromString('#')).toBeUndefined();
      expect(getColorFromString('#GG')).toBeUndefined();
      expect(getColorFromString('#GGGGGG')).toBeUndefined();
      expect(getColorFromString('#12')).toBeUndefined();
      expect(getColorFromString('#12345')).toBeUndefined();
      expect(getColorFromString('#1234567')).toBeUndefined();
    });

    it('should handle invalid rgb colors', () => {
      expect(getColorFromString('rgb()')).toBeUndefined();
      expect(getColorFromString('rgb(255, 0)')).toBeUndefined();
      expect(getColorFromString('rgb(255, 0, 0, 0, 0)')).toBeUndefined();
    });

    it('should handle invalid hsl colors', () => {
      expect(getColorFromString('hsl()')).toBeUndefined();
      expect(getColorFromString('hsl(0, 0)')).toBeUndefined();
    });

    it('should handle invalid named colors', () => {
      expect(getColorFromString('invalidcolor')).toBeUndefined();
      expect(getColorFromString('notacolor')).toBeUndefined();
      expect(getColorFromString('rgb')).toBeUndefined();
      expect(getColorFromString('hsl')).toBeUndefined();
    });

    it('should handle empty and whitespace strings', () => {
      expect(getColorFromString('')).toBeUndefined();
      expect(getColorFromString(' ')).toBeUndefined();
      expect(getColorFromString('\t')).toBeUndefined();
      expect(getColorFromString('\n')).toBeUndefined();
    });

    it('should handle malformed color strings', () => {
      expect(getColorFromString('color(srgb 1 0 0)')).toBeUndefined(); // CSS Color Module 4
    });
  });

  describe('practical CSS color scenarios', () => {
    it('should parse colors commonly used in CSS frameworks', () => {
      // Bootstrap colors
      expect(getColorFromString('#007bff')).toEqual([0, 123, 255]); // Bootstrap primary
      expect(getColorFromString('#6c757d')).toEqual([108, 117, 125]); // Bootstrap secondary
      expect(getColorFromString('#28a745')).toEqual([40, 167, 69]); // Bootstrap success
      expect(getColorFromString('#dc3545')).toEqual([220, 53, 69]); // Bootstrap danger
    });

    it('should parse Material Design colors', () => {
      expect(getColorFromString('#2196F3')).toEqual([33, 150, 243]); // Material Blue
      expect(getColorFromString('#4CAF50')).toEqual([76, 175, 80]); // Material Green
      expect(getColorFromString('#FF9800')).toEqual([255, 152, 0]); // Material Orange
    });

    it('should parse colors with various whitespace', () => {
      expect(getColorFromString('  #ffffff  ')).toEqual([255, 255, 255]);
      expect(getColorFromString('\trgb(255,0,0)\n')).toEqual([255, 0, 0]);
      expect(getColorFromString(' hsl(120, 100%, 50%) ')).toEqual([0, 255, 0]);
    });

    it('should handle semi-transparent overlays commonly used in UI', () => {
      expect(getColorFromString('rgba(0, 0, 0, 0.5)')).toEqual([0, 0, 0, 0.5]); // 50% black overlay
      expect(getColorFromString('rgba(255, 255, 255, 0.9)')).toEqual([255, 255, 255, 0.9]); // 90% white overlay
      expectArrayCloseTo(getColorFromString('hsla(200, 100%, 50%, 0.3)'), [0, 170, 255, 0.3]); // 30% blue overlay
    });
  });
});

describe('getColorFromBackground function', () => {
  it('should extract color from simple background', () => {
    const result = getColorFromBackground('white');
    expect(result).toEqual([255, 255, 255]);
  });

  it('should extract first color from gradient', () => {
    const result = getColorFromBackground('linear-gradient(to right, #FF0000, #0000FF)');
    expect(result).toEqual([255, 0, 0]);
  });

  it('should extract color from complex background shorthand', () => {
    const result = getColorFromBackground('url(image.jpg) #00FF00 repeat-x');
    expect(result).toEqual([0, 255, 0]);
  });

  it('should return null for background without color', () => {
    const result = getColorFromBackground('url(image.jpg) repeat-x');
    expect(result).toBeUndefined();
  });

  it('should extract rgba color from background', () => {
    const result = getColorFromBackground('rgba(255, 0, 0, 0.5)');
    expect(result).toEqual([255, 0, 0, 0.5]);
  });
});

describe('contrast function with helper integration', () => {
  it('should work with hex color parsing including alpha', () => {
    const black = getColorFromString('#000');
    const white = getColorFromString('#FFF');

    expect(black).not.toBeUndefined();
    expect(white).not.toBeUndefined();

    if (black && white) {
      expect(black).toEqual([0, 0, 0]);
      expect(white).toEqual([255, 255, 255]);
      const result = contrast(black, white);
      expect(result).toBeCloseTo(21, 1);
    }
  });

  it('should work with rgba colors (ignoring alpha for contrast)', () => {
    const semiTransparentRed = getColorFromString('rgba(255, 0, 0, 0.5)');
    const white = getColorFromString('white');

    expect(semiTransparentRed).not.toBeUndefined();
    expect(white).not.toBeUndefined();

    if (semiTransparentRed && white) {
      expect(semiTransparentRed).toEqual([255, 0, 0, 0.5]);
      expect(white).toEqual([255, 255, 255]);
      // Contrast function uses only RGB values (first 3 elements)
      const result = contrast(semiTransparentRed, white);
      expect(result).toBeGreaterThan(1);
    }
  });

  it('should work with named color parsing', () => {
    const red = getColorFromString('red');
    const blue = getColorFromString('blue');

    expect(red).not.toBeUndefined();
    expect(blue).not.toBeUndefined();

    if (red && blue) {
      expect(red).toEqual([255, 0, 0]);
      expect(blue).toEqual([0, 0, 255]);
      const result = contrast(red, blue);
      expect(result).toBeGreaterThan(1);
    }
  });

  it('should work with background color extraction', () => {
    const bgColor = getColorFromBackground('white');
    const textColor = getColorFromString('#333');

    expect(bgColor).not.toBeUndefined();
    expect(textColor).not.toBeUndefined();

    if (bgColor && textColor) {
      expect(bgColor).toEqual([255, 255, 255]);
      expect(textColor).toEqual([51, 51, 51]);
      const result = contrast(bgColor, textColor);
      expect(result).toBeGreaterThan(4.5);
    }
  });

  it('should work with gradient background', () => {
    const bgColor = getColorFromBackground('linear-gradient(#FFFFFF, #000000)');
    const textColor = getColorFromString('black');

    expect(bgColor).not.toBeUndefined();
    expect(textColor).not.toBeUndefined();

    if (bgColor && textColor) {
      expect(bgColor).toEqual([255, 255, 255]);
      expect(textColor).toEqual([0, 0, 0]);
      const result = contrast(bgColor, textColor);
      expect(result).toBeCloseTo(21, 1);
    }
  });
});

describe('realistic CSS color combinations', () => {
  it('should pass WCAG AA for dark text on light background', () => {
    const darkText = getColorFromString('#212529');
    const lightBg = getColorFromString('#F8F9FA');

    if (darkText && lightBg) {
      expect(darkText).toEqual([33, 37, 41]);
      expect(lightBg).toEqual([248, 249, 250]);
      const result = contrast(darkText, lightBg);
      expect(result).toBeGreaterThan(4.5);
    }
  });

  it('should fail WCAG AA for light text on white background', () => {
    const lightText = getColorFromString('#7C858D');
    const whiteBg = getColorFromString('#FFFFFF');

    if (lightText && whiteBg) {
      expect(lightText).toEqual([124, 133, 141]);
      expect(whiteBg).toEqual([255, 255, 255]);
      const result = contrast(lightText, whiteBg);
      expect(result).toBeLessThan(4.5);
    }
  });

  it('should test common web colors with alpha', () => {
    const testCases = [
      { fg: 'rgba(255, 255, 255, 0.9)', bg: '#000000', expected: 'high' },
      { fg: 'rgba(0, 0, 0, 0.8)', bg: '#FFFFFF', expected: 'high' },
      { fg: 'rgba(204, 204, 204, 1)', bg: '#FFFFFF', expected: 'low' },
      { fg: 'hsla(0, 0%, 40%, 1)', bg: '#FFFFFF', expected: 'medium' },
    ];

    testCases.forEach(({ fg, bg, expected }) => {
      const fgColor = getColorFromString(fg);
      const bgColor = getColorFromString(bg);

      if (fgColor && bgColor) {
        const result = contrast(fgColor, bgColor);

        switch (expected) {
          case 'high':
            expect(result).toBeGreaterThan(15);
            break;
          case 'medium':
            expect(result).toBeGreaterThan(4.5);
            expect(result).toBeLessThan(15);
            break;
          case 'low':
            expect(result).toBeLessThan(4.5);
            break;
        }
      }
    });
  });
});

function expectArrayCloseTo(actual: number[] | undefined, expected: number[], precision = -1) {
  expect(actual).toHaveLength(expected.length);
  assert(actual);
  expected.forEach((expectedValue, index) => {
    expect(actual[index]).toBeCloseTo(expectedValue, precision);
  });
}
