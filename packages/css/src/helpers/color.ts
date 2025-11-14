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
import postcssValueParser from 'postcss-value-parser';
import Color from 'color';

/**
 * Get color from the CSS background property. The background property contains other properties
 * like image, repeat, position, etc. so we try to extract the color from any of the values.
 * @param value string of the background property
 * @returns [r,g,b,a] array or undefined if not a valid color
 */
export function getColorFromBackground(value: string) {
  let color: number[] | undefined = undefined;
  postcssValueParser(value).walk(node => {
    if (node.type === 'word' && !color) {
      color = getColorFromString(node.value);
    } else if (node.type === 'function') {
      color = getColorFromString(postcssValueParser.stringify(node));
    }
  });
  return color;
}

/**
 * Get color from CSS color string. Support hex, rgb, rgba, hsl, hsla, and named colors.
 * @param value
 * @returns [r,g,b,a] array or undefined if not a valid color
 */
export function getColorFromString(value: string) {
  try {
    return Color(value.trim().toLowerCase()).rgb().array();
  } catch {}
}

/**
 * Check if the color is almost transparent. 4th value in rgba array is alpha.
 * @param color - [r,g,b,a] array
 */
export function isAlmostTransparent(color: number[]) {
  return color.length > 3 && color[3] < 0.01;
}

/// contrast and luminance calculation taken from https://stackoverflow.com/a/63270816

/*
Added to both luminance values to avoid division by zero and account for ambient light reflection.
This follows the WCAG (Web Content Accessibility Guidelines) contrast ratio formula,
which ensures that the contrast calculation never results in division by zero and
provides more realistic contrast ratios by accounting for ambient light conditions.
 */
const CORRECTION = 0.05;
export function contrast(rgb1: number[], rgb2: number[]) {
  const lum1 = luminance(...rgb1);
  const lum2 = luminance(...rgb2);
  const [brightest, darkest] = lum1 > lum2 ? [lum1, lum2] : [lum2, lum1];

  return (brightest + CORRECTION) / (darkest + CORRECTION);
}

/*
These values represent how sensitive the human eye is to different colors.
Our eyes are most sensitive to green light (71.52%), less sensitive to red (21.26%),
and least sensitive to blue (7.22%). These weights sum to 1.0 and are
defined by the ITU-R BT.709 standard for HDTV.
*/
const RED = 0.2126;
const GREEN = 0.7152;
const BLUE = 0.0722;
/*
Gamma correction to convert from the non-linear sRGB
values to linear light values, which is necessary for accurate luminance calculations.
Standard gamma value for sRGB color space
*/
const GAMMA = 2.4;

// Threshold value below which linear scaling is used instead of gamma correction
const THRESHOLD = 0.03928;
// Linear scaling factor for low values (inverse of gamma correction slope at 0)
const LINEAR_SCALE = 12.92;
// Offset constant for gamma correction formula
const GAMMA_OFFSET = 0.055;
// 1.055 - Scaling constant for gamma correction formula
const GAMMA_SCALING = 1.055;

function luminance(...rgb: number[]) {
  const a = rgb.slice(0, 3).map(v => {
    v /= 255;
    if (v <= THRESHOLD) {
      return v / LINEAR_SCALE;
    } else {
      return ((v + GAMMA_OFFSET) / GAMMA_SCALING) ** GAMMA;
    }
  });
  return a[0] * RED + a[1] * GREEN + a[2] * BLUE;
}
