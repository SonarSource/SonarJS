/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { Range } from './ranges';

export const LINE_ADJUSTMENT = '(?:@(?<lineAdjustment>(?<relativeAdjustment>[+-])?\\d+))?';

const STARTS_WITH_LOCATION = /^ *\^/;
const COUNT = '(?<count>\\d+)';
const DIRECTION = '(?<direction>[<>])';
const MESSAGE = '(?<message>.*?)';
const LOCATION_PATTERN = RegExp(
  ' *' +
    // highlighted range, ex: ^^^^ |OR| ^^^@12 |OR| ^^^@-2
    '(?<range>\\^(?:\\[(?<params>[^\\]]+)\\]|\\^+)?)' +
    LINE_ADJUSTMENT +
    // count, ex: 3 |OR| direction
    ' *(?:' +
    COUNT +
    '|' +
    DIRECTION +
    ')?' +
    // message, ex: {{msg}}
    ' *(?:\\{\\{' +
    MESSAGE +
    '\\}\\})? *' +
    '(?:\r(\n?)|\n)?',
);

export abstract class Location {
  constructor(readonly range: Range) {}
}

export class PrimaryLocation extends Location {
  readonly secondaryLocations: SecondaryLocation[] = [];
  expectedAdditionalCount: number | undefined;

  constructor(range: Range, expectedAdditionalCount: number | undefined) {
    super(range);
    this.expectedAdditionalCount = expectedAdditionalCount;
  }

  addSecondary(range: Range, message: string | undefined) {
    const primaryIsBefore = this.range.compareTo(range) <= 0;
    const location = new SecondaryLocation(range, message, primaryIsBefore);
    this.secondaryLocations.push(location);
    return location;
  }

  secondaryLocationCount() {
    return this.secondaryLocations.length;
  }
}

export class SecondaryLocation extends Location {
  index: number | undefined;
  message: string | undefined;

  constructor(range: Range, message: string | undefined, readonly primaryIsBefore: boolean) {
    super(range);
    this.message = message;
  }
}

export function extractLocations(line: number, column: number, commentContent: string) {
  if (STARTS_WITH_LOCATION.test(commentContent)) {
    const result: Location[] = [];
    let comment = commentContent;
    let offset = 0;
    let matcher: RegExpMatchArray | null;
    LOCATION_PATTERN.lastIndex = 0;
    while ((matcher = comment.match(LOCATION_PATTERN)) !== null) {
      result.push(
        matcherToLocation(line, column, commentContent.indexOf(matcher[1], offset), matcher),
      );
      comment = comment.substring(matcher[0].length);
      offset += matcher[0].length;
    }
    if (offset !== commentContent.length) {
      const position = `line ${line} col ${column + commentContent[offset]}`;
      throw new Error(`Location: unexpected character found at ${position}: ${commentContent}"`);
    }
    return result;
  }
  return [];
}

function matcherToLocation(
  line: number,
  column: number,
  offset: number,
  matcher: RegExpMatchArray,
) {
  const effectiveLine = extractEffectiveLine(line - 1, matcher);
  const range = fileRange(effectiveLine, column, offset, matcher);
  const direction = matcher.groups?.direction;
  if (!direction) {
    const countGroup = matcher.groups?.count;
    const additionalCount = countGroup ? parseInt(countGroup) : undefined;
    return new PrimaryLocation(range, additionalCount);
  } else {
    return new SecondaryLocation(range, matcher.groups?.message, direction === '<');
  }
}

export function extractEffectiveLine(line: number, matcher: RegExpMatchArray) {
  const lineAdjustmentGroup = matcher.groups?.lineAdjustment;
  const relativeAdjustmentGroup = matcher.groups?.relativeAdjustment;
  const referenceLine = relativeAdjustmentGroup ? line : 0;
  return lineAdjustmentGroup ? referenceLine + parseInt(lineAdjustmentGroup) : line;
}

function fileRange(line: number, column: number, offset: number, matcher: RegExpMatchArray) {
  const rangeLine = line;
  const rangeColumn = column + offset;
  const rangeEndLine = line;
  const rangeEndColumn = rangeColumn + matcher[1].length + 1;
  return new Range(rangeLine, rangeColumn, rangeEndLine, rangeEndColumn);
}
