/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import postcssValueParser from 'postcss-value-parser';
import Color from 'color';

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

export function getColorFromString(value: string) {
  try {
    return Color(value.trim().toLowerCase()).rgb().array();
  } catch {}
}

/// https://stackoverflow.com/a/63270816
const RED = 0.2126;
const GREEN = 0.7152;
const BLUE = 0.0722;
const GAMMA = 2.4;

function luminance(...rgb: number[]) {
  const a = rgb.slice(0, 3).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** GAMMA;
  });
  return a[0] * RED + a[1] * GREEN + a[2] * BLUE;
}

export function contrast(rgb1: number[], rgb2: number[]) {
  const lum1 = luminance(...rgb1);
  const lum2 = luminance(...rgb2);
  const [brightest, darkest] = lum1 > lum2 ? [lum1, lum2] : [lum2, lum1];
  return (brightest + 0.05) / (darkest + 0.05);
}
