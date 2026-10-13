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
// https://sonarsource.github.io/rspec/#/rspec/S6324/javascript

import type { Rule } from 'eslint';
import type { AST } from '@eslint-community/regexpp';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

const EXCEPTIONS = new Set(['\t', '\n']);

const MAX_CONTROL_CHAR_CODE = 0x1f;
const DELETE = 0x7f;
const MAX_C1_CONTROL_CHAR_CODE = 0x9f;

// ANSI escape sequence control characters
const ESC = 0x1b;
const BEL = 0x07;
const LEFT_BRACKET = 0x5b; // [
const RIGHT_BRACKET = 0x5d; // ]
const BACKSLASH = 0x5c;
const STRING_TERMINATOR = 0x9c;
const OSC = 0x9d;
const OSC_DELIMITERS = [BEL, ESC, STRING_TERMINATOR, OSC];

/**
 * Control characters used as range boundaries (e.g., [\x00-\x1f]) indicate intentional usage.
 */
function isCharacterClassRangeBoundary(character: AST.Character): boolean {
  return character.parent.type === 'CharacterClassRange';
}

/**
 * Standalone control characters are exempt only when the character class contains
 * a range that starts in the control-character block (e.g., [\x00-\x08\x0b\x0c]).
 */
function isInCharacterClassWithControlCharRange(character: AST.Character): boolean {
  const parent = character.parent;
  if (parent.type !== 'CharacterClass') {
    return false;
  }
  return parent.elements.some(
    element => element.type === 'CharacterClassRange' && element.min.value <= MAX_CONTROL_CHAR_CODE,
  );
}

/**
 * Checks if ESC (0x1b) is followed by [ or ] to form ANSI CSI/OSC sequence start.
 * Per xterm spec, ESC + [ starts a CSI sequence, ESC + ] starts an OSC sequence.
 */
function isAnsiSequenceStart(character: AST.Character): boolean {
  if (character.value !== ESC) {
    return false;
  }
  const parent = character.parent;
  if (parent.type !== 'Alternative') {
    return false;
  }
  const elements = parent.elements;
  const index = elements.indexOf(character);
  if (index === -1 || index >= elements.length - 1) {
    return false;
  }
  const next = elements[index + 1];
  if (next.type !== 'Character') {
    return false;
  }
  return next.value === LEFT_BRACKET || next.value === RIGHT_BRACKET;
}

type OscMatcher = { start: number; end: number };

/** Recognizes deliberate OSC delimiter matching, not terminal-protocol validity. */
function findOscMatchers(alternative: AST.Alternative): OscMatcher[] {
  for (let ancestor: AST.Node | null = alternative.parent; ancestor; ancestor = ancestor.parent) {
    if (ancestor.type === 'Assertion') {
      return [];
    }
  }

  const matches: OscMatcher[] = [];
  const { elements } = alternative;
  for (let i = 0; i < elements.length; i++) {
    const introducerLength = oscIntroducerLength(elements, i);
    if (introducerLength === 0) {
      continue;
    }
    let endIndex = i + introducerLength;
    while (endIndex < elements.length && isOscPayload(elements[endIndex])) {
      endIndex++;
    }
    const terminatorLength = oscTerminatorLength(elements, endIndex);
    if (terminatorLength > 0) {
      matches.push({
        start: elements[i].start,
        end: elements[endIndex + terminatorLength - 1].end,
      });
    }
  }
  return matches;
}

function oscIntroducerLength(elements: readonly AST.Element[], index: number): number {
  const element = elements[index];
  if (isCharacter(element, OSC)) {
    return 1;
  }
  if (isCharacter(element, ESC) && isCharacter(elements[index + 1], RIGHT_BRACKET)) {
    return 2;
  }
  return isGroup(element) && element.alternatives.every(isOscIntroducerAlternative) ? 1 : 0;
}

function isOscIntroducerAlternative(alternative: AST.Alternative): boolean {
  const [first, second] = alternative.elements;
  return (
    (alternative.elements.length === 1 && isCharacter(first, OSC)) ||
    (alternative.elements.length === 2 &&
      isCharacter(first, ESC) &&
      isCharacter(second, RIGHT_BRACKET))
  );
}

function oscTerminatorLength(elements: readonly AST.Element[], index: number): number {
  const element = elements[index];
  if (isCharacter(element, BEL) || isCharacter(element, STRING_TERMINATOR)) {
    return 1;
  }
  if (isCharacter(element, ESC) && isCharacter(elements[index + 1], BACKSLASH)) {
    return 2;
  }
  return isGroup(element) && element.alternatives.every(isOscTerminatorAlternative) ? 1 : 0;
}

function isOscTerminatorAlternative(alternative: AST.Alternative): boolean {
  const [first, second] = alternative.elements;
  return (
    (alternative.elements.length === 1 &&
      (isCharacter(first, BEL) || isCharacter(first, STRING_TERMINATOR))) ||
    (alternative.elements.length === 2 && isCharacter(first, ESC) && isCharacter(second, BACKSLASH))
  );
}

function isCharacter(element: AST.Element | undefined, value: number): boolean {
  return element?.type === 'Character' && element.value === value;
}

function isGroup(element: AST.Element | undefined): element is AST.Group | AST.CapturingGroup {
  return element?.type === 'Group' || element?.type === 'CapturingGroup';
}

function isOscPayload(element: AST.Element): boolean {
  if (element.type === 'Character') {
    return (
      element.value >= 0x20 && (element.value < DELETE || element.value > MAX_C1_CONTROL_CHAR_CODE)
    );
  }
  if (element.type === 'Quantifier') {
    return isOscPayload(element.element);
  }
  if (element.type !== 'CharacterClass' || !element.negate) {
    return false;
  }
  return (
    element.elements.every(
      item => item.type === 'Character' || item.type === 'CharacterClassRange',
    ) &&
    OSC_DELIMITERS.every(value =>
      element.elements.some(item =>
        item.type === 'Character'
          ? item.value === value
          : item.type === 'CharacterClassRange' &&
            item.min.value <= value &&
            value <= item.max.value,
      ),
    )
  );
}

export const rule: Rule.RuleModule = createRegExpRule(context => {
  const oscMatchers: OscMatcher[] = [];
  return {
    onAlternativeEnter: alternative => {
      oscMatchers.push(...findOscMatchers(alternative));
    },
    onCharacterEnter: (character: AST.Character) => {
      const { value, raw } = character;
      if (
        value >= 0x00 &&
        value <= MAX_CONTROL_CHAR_CODE &&
        (isSameInterpreted(raw, value) ||
          raw.startsWith(String.raw`\x`) ||
          raw.startsWith(String.raw`\u`)) &&
        !EXCEPTIONS.has(raw) &&
        !isCharacterClassRangeBoundary(character) &&
        !isInCharacterClassWithControlCharRange(character) &&
        !isAnsiSequenceStart(character) &&
        !(
          (value === BEL || value === ESC) &&
          oscMatchers.some(
            matcher => matcher.start <= character.start && character.end <= matcher.end,
          )
        )
      ) {
        context.reportRegExpNode({
          message: 'Remove this control character.',
          node: context.node,
          regexpNode: character,
        });
      }
    },
  };
}, generateMeta(meta));

/**
 * When the character has been interpreted, we need to compare its
 * code point value.
 */
function isSameInterpreted(raw: string, value: number) {
  return raw.codePointAt(0) === value;
}
