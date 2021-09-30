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

import { extractParams } from './comments';
import { Range } from './ranges';

export abstract class Location {
  constructor(readonly range: Range) {}
}

export class PrimaryLocation extends Location {
  expectedAdditionalCount: number | undefined;
  readonly secondaryLocations: SecondaryLocation[] = [];

  constructor(range: Range, expectedAdditionalCount: number | undefined) {
    super(range);
    this.expectedAdditionalCount = expectedAdditionalCount;
  }

  addSecondary(range: Range, message: string | undefined) {
    const primaryIsBefore = this.range.compareTo(range) <= 0;
    const location = new SecondaryLocation(
      range,
      primaryIsBefore,
      this.secondaryLocations.length + 1,
      message,
    );
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

  constructor(
    range: Range,
    readonly primaryIsBefore: boolean,
    index: number | undefined,
    message: string | undefined,
  ) {
    super(range);
    this.index = index;
    this.message = message;
  }
}

export const LINE_ADJUSTMENT = '(?:@(?<lineAdjustment>(?<relativeAdjustment>[+-])?\\d+))?';
const TRIGGER = /^ *\^/;
const COUNT = '(?<count>\\d+)';
const DIRECTION = '(?<direction>[<>])';
const MAJOR_INDEX = '(?<majorIndex>\\d+)';
const MINOR_INDEX = '(?<minorIndex>\\d+)';
const MESSAGE = '(?<message>.*?)';
const LOCATION_REGEX = RegExp(
  ' *' +
    // highlighted range, ex: ^^^^ |OR| ^^^@12 |OR| ^^^@-2
    '(?<range>\\^(?:\\[(?<params>[^\\]]+)\\]|\\^+)?)' +
    LINE_ADJUSTMENT +
    // count, ex: 3 |OR| direction, ex: < |OR| direction with index, ex: < 1 |OR| direction and flowId, ex: < 2.1
    ' *(?:' +
    COUNT +
    '|(?:' +
    DIRECTION +
    ' *(' +
    MAJOR_INDEX +
    '(\\.' +
    MINOR_INDEX +
    ')?)?))?' +
    // message, ex: {{msg}}
    ' *(?:\\{\\{' +
    MESSAGE +
    '\\}\\} )? *' +
    '(?:\r(\n?)|\n)?',
);

export function parseLocations(line: number, column: number, commentContent: string) {
  if (TRIGGER.test(commentContent)) {
    LOCATION_REGEX.lastIndex = 0;
    const result: Location[] = [];
    let comment = commentContent;
    let offset = 0;
    let matcher: RegExpMatchArray | null;
    while ((matcher = comment.match(LOCATION_REGEX)) !== null) {
      result.push(matcherToLocation(line, column, offset, matcher));
      comment = comment.substring(matcher[0].length);
      offset += matcher[0].length;
    }
    if (offset !== commentContent.length) {
      const position = `line ${line} col ${column + commentContent[offset]}`;
      throw new Error(`Location: unexpected character found at ${position} in: ${commentContent}"`);
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
  const direction = matcher.groups ? matcher.groups.direction : undefined;
  const minorIndexGroup = matcher.groups ? matcher.groups.minorIndex : undefined;
  if (direction == null) {
    const countGroup = matcher.groups ? matcher.groups.count : undefined;
    const additionalCount = countGroup === undefined ? undefined : Number.parseInt(countGroup);
    return new PrimaryLocation(range, additionalCount);
  }
  if (minorIndexGroup == undefined) {
    const majorIndex = matcher.groups ? matcher.groups.majorIndex : undefined;
    const index = majorIndex === undefined ? undefined : Number.parseInt(majorIndex);
    return new SecondaryLocation(
      range,
      direction === '<',
      index,
      matcher.groups ? matcher.groups.message : undefined,
    );
  }
  throw new Error('FIXME');
  // int majorIndex = Integer.parseInt(matcher.group("majorIndex"));
  // int minorIndex = Integer.parseInt(minorIndexGroup);
  // return new FlowLocation(range, direction.equals("<"), majorIndex, minorIndex, matcher.group("message"));
}

export function extractEffectiveLine(line: number, matcher: RegExpMatchArray) {
  const lineAdjustmentGroup = matcher.groups ? matcher.groups.lineAdjustment : undefined;
  const relativeAdjustmentGroup = matcher.groups ? matcher.groups.relativeAdjustment : undefined;
  const referenceLine = relativeAdjustmentGroup !== undefined ? line : 0;
  return lineAdjustmentGroup === undefined
    ? line
    : referenceLine + Number.parseInt(lineAdjustmentGroup);
}

function fileRange(line: number, column: number, offset: number, matcher: RegExpMatchArray) {
  let rangeLine = line;
  let rangeColumn = column + offset;
  // let rangeColumn = column + matcher.start('range');
  let rangeEndLine = line;
  let rangeEndColumn = rangeColumn + matcher[0].length - 1;
  // let rangeEndColumn = column + matcher.end('range') - 1;
  const params = matcher.groups ? matcher.groups.params : null;
  if (params != null) {
    rangeEndColumn = rangeColumn;
    const paramMap = extractParams(params);
    rangeLine = consumePropertyAndAdjustValue(rangeLine, paramMap, 'sl');
    rangeColumn = consumePropertyAndAdjustValue(rangeColumn, paramMap, 'sc');
    rangeEndColumn = consumePropertyAndAdjustValue(rangeEndColumn, paramMap, 'ec');
    rangeEndLine = consumePropertyAndAdjustValue(rangeEndLine, paramMap, 'el');
    if (paramMap.size !== 0) {
      throw new Error(`Unknown attributes at line ${line} in: ${params}`);
    }
  }
  return new Range(rangeLine, rangeColumn, rangeEndLine, rangeEndColumn);
}

function consumePropertyAndAdjustValue(
  referenceValue: number,
  paramMap: Map<string, string>,
  propertyName: string,
) {
  const shift = paramMap.get(propertyName);
  if (shift === undefined) {
    return referenceValue;
  }
  paramMap.delete(propertyName);
  if (shift.startsWith('-') || shift.startsWith('+')) {
    return referenceValue + Number.parseInt(shift.substring(1));
  }
  return Number.parseInt(shift);
}
