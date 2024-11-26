/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { Range } from './ranges.js';
import { FileIssues } from './file.js';
import { Comment } from './comments.js';

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
}

export class SecondaryLocation extends Location {
  index: number | undefined;
  message: string | undefined;

  constructor(
    range: Range,
    message: string | undefined,
    readonly primaryIsBefore: boolean,
  ) {
    // we need to extract 1 from columns as it's computed by us being sonar-friendly, while primary location is eslint-friendly
    super(new Range(range.line, range.column - 1, range.endLine, range.endColumn - 1));
    this.message = message;
  }
}

export function isLocationLine(comment: string) {
  return STARTS_WITH_LOCATION.test(comment);
}

export function extractLocations(file: FileIssues, comment: Comment) {
  const { line, column, value: commentContent } = comment;
  const locations: Location[] = [];
  let toBeMatched = commentContent;
  let offset = 0;
  let matcher: RegExpMatchArray | null;
  LOCATION_PATTERN.lastIndex = 0;
  while ((matcher = LOCATION_PATTERN.exec(toBeMatched)) !== null) {
    locations.push(
      matcherToLocation(line, column, commentContent.indexOf(matcher[1], offset) + 1, matcher),
    );
    toBeMatched = toBeMatched.substring(matcher[0].length);
    offset += matcher[0].length;
  }
  if (offset !== commentContent.length) {
    throw new Error(
      `Unexpected character '${commentContent[offset]}' found at ${line}:${column + offset}`,
    );
  }
  if (locations.length) {
    for (const location of locations) {
      file.addLocation(location);
    }
  }
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
    return new PrimaryLocation(range);
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
  const rangeEndColumn = rangeColumn + matcher[1].length;
  return new Range(rangeLine, rangeColumn, rangeEndLine, rangeEndColumn);
}
