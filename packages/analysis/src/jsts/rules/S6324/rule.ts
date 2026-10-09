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

// ANSI escape sequence control characters
const ESC = 0x1b;
const BEL = 0x07;
const LEFT_BRACKET = 0x5b; // [
const RIGHT_BRACKET = 0x5d; // ]
const BACKSLASH = 0x5c;
const STRING_TERMINATOR = 0x9c;
const CAN = 0x18;
const SUB = 0x1a;
const ASCII_DIGIT_MIN = 0x30;
const ASCII_DIGIT_MAX = 0x39;
const UNSAFE_OSC_PAYLOAD_CHARACTERS = [BEL, CAN, SUB, ESC, STRING_TERMINATOR];

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

/**
 * Checks whether a control character terminates a complete OSC sequence.
 */
function isOscTerminator(character: AST.Character): boolean {
  if (character.value !== BEL && character.value !== ESC) {
    return false;
  }

  const alternative = character.parent;
  if (alternative.type !== 'Alternative') {
    return false;
  }

  if (
    isOscTerminatorShape(alternative, character) &&
    hasOscIntroducerBefore(alternative, character)
  ) {
    return true;
  }

  const group = alternative.parent;
  return (
    (group.type === 'Group' || group.type === 'CapturingGroup') &&
    isGroupedOscTerminator(alternative)
  );
}

function isGroupedOscTerminator(alternative: AST.Alternative): boolean {
  const group = alternative.parent;
  if (
    (group.type !== 'Group' && group.type !== 'CapturingGroup') ||
    !isOscTerminatorAlternative(alternative)
  ) {
    return false;
  }

  const parent = group.parent;
  if (parent.type !== 'Alternative' || !group.alternatives.every(isOscTerminatorAlternative)) {
    return false;
  }

  return hasOscIntroducerBefore(parent, group);
}

function isOscTerminatorAlternative(alternative: AST.Alternative): boolean {
  const [first, second] = alternative.elements;
  return (
    (alternative.elements.length === 1 &&
      (isCharacter(first, BEL) || isCharacter(first, STRING_TERMINATOR))) ||
    (alternative.elements.length === 2 && isCharacter(first, ESC) && isCharacter(second, BACKSLASH))
  );
}

function isOscTerminatorShape(alternative: AST.Alternative, character: AST.Character): boolean {
  const index = alternative.elements.indexOf(character);
  if (index === -1) {
    return false;
  }
  return (
    character.value === BEL ||
    mustFollowWithCharacterThroughZeroWidth(alternative.elements, index + 1, BACKSLASH)
  );
}

function mustFollowWithCharacterThroughZeroWidth(
  elements: readonly AST.Element[],
  startIndex: number,
  value: number,
): boolean {
  for (let i = startIndex; i < elements.length; i++) {
    if (mustStartWithCharacter(elements[i], value)) {
      return true;
    }
    if (!isAlwaysEmpty(elements[i])) {
      return false;
    }
  }
  return false;
}

function mustStartWithCharacter(element: AST.Element, value: number): boolean {
  if (isCharacter(element, value)) {
    return true;
  }
  if (element.type === 'CharacterClass') {
    return characterClassAlwaysMatchesValue(element, value);
  }
  if (element.type === 'Quantifier') {
    return element.min > 0 && mustStartWithCharacter(element.element, value);
  }
  return (
    (element.type === 'Group' || element.type === 'CapturingGroup') &&
    element.alternatives.every(alternative => alternativeMustStartWithCharacter(alternative, value))
  );
}

function alternativeMustStartWithCharacter(alternative: AST.Alternative, value: number): boolean {
  for (const element of alternative.elements) {
    if (mustStartWithCharacter(element, value)) {
      return true;
    }
    if (!isAlwaysEmpty(element)) {
      return false;
    }
  }
  return false;
}

function isCharacter(element: AST.Element | undefined, value: number): boolean {
  return element?.type === 'Character' && element.value === value;
}

function hasOscIntroducerBefore(alternative: AST.Alternative, node: AST.Node): boolean {
  const elements = alternative.elements;
  const index = elements.indexOf(node as AST.Element);
  for (let i = index - 1; i >= 0; i--) {
    const curr = elements[i];
    const prev = elements[i - 1];
    if (prev?.type === 'Character' && prev.value === ESC && isCharacter(curr, RIGHT_BRACKET)) {
      return elements.slice(i + 1, index).every(isSafeOscPayload);
    }
  }
  return false;
}

function isAlwaysEmpty(element: AST.Element): boolean {
  if (element.type === 'Assertion') {
    return true;
  }
  if (element.type === 'Quantifier') {
    return element.max === 0 || isAlwaysEmpty(element.element);
  }
  return (
    (element.type === 'Group' || element.type === 'CapturingGroup') &&
    element.alternatives.every(alternative => alternative.elements.every(isAlwaysEmpty))
  );
}

function characterClassAlwaysMatchesValue(
  characterClass: AST.CharacterClass,
  value: number,
): boolean {
  return (
    !characterClass.negate &&
    characterClass.elements.length > 0 &&
    characterClass.elements.every(
      element =>
        (element.type === 'Character' && element.value === value) ||
        (element.type === 'CharacterClassRange' &&
          element.min.value === value &&
          element.max.value === value),
    )
  );
}

function isSafeOscPayload(element: AST.Element): boolean {
  if (element.type === 'Assertion') {
    return true;
  }
  if (element.type === 'Character') {
    return !isUnsafeOscPayloadCharacter(element.value);
  }
  if (element.type === 'CharacterSet') {
    return isSafeOscCharacterSet(element);
  }
  if (element.type === 'CharacterClass') {
    return isSafeOscCharacterClass(element);
  }
  if (element.type === 'Quantifier') {
    return isSafeOscPayload(element.element);
  }
  return (
    (element.type === 'Group' || element.type === 'CapturingGroup') &&
    element.alternatives.every(alternative => alternative.elements.every(isSafeOscPayload))
  );
}

function isSafeOscCharacterSet(characterSet: AST.CharacterSet): boolean {
  // A wildcard is the established OSC payload form in the rule's existing contract.
  if (characterSet.kind === 'any') {
    return true;
  }
  return UNSAFE_OSC_PAYLOAD_CHARACTERS.every(
    value => characterSetMatchesValue(characterSet, value) === false,
  );
}

function isSafeOscCharacterClass(characterClass: AST.CharacterClass): boolean {
  return UNSAFE_OSC_PAYLOAD_CHARACTERS.every(value => {
    return characterClass.negate
      ? characterClass.elements.some(element => elementDefinitelyMatchesValue(element, value))
      : !characterClass.elements.some(element => elementCanMatchValue(element, value));
  });
}

function isUnsafeOscPayloadCharacter(value: number): boolean {
  return (
    value === BEL || value === CAN || value === SUB || value === ESC || value === STRING_TERMINATOR
  );
}

function elementCanMatchValue(element: AST.CharacterClassElement, value: number): boolean {
  if (element.type === 'Character') {
    return element.value === value;
  }
  if (element.type === 'CharacterClassRange') {
    return element.min.value <= value && value <= element.max.value;
  }
  if (element.type !== 'CharacterSet') {
    return true;
  }
  return characterSetMatchesValue(element as AST.CharacterSet, value) !== false;
}

function elementDefinitelyMatchesValue(element: AST.CharacterClassElement, value: number): boolean {
  if (element.type === 'Character') {
    return element.value === value;
  }
  if (element.type === 'CharacterClassRange') {
    return element.min.value <= value && value <= element.max.value;
  }
  if (element.type !== 'CharacterSet') {
    return false;
  }
  return characterSetMatchesValue(element as AST.CharacterSet, value) === true;
}

function characterSetMatchesValue(
  characterSet: AST.CharacterSet,
  value: number,
): boolean | undefined {
  let matches: boolean | undefined;
  switch (characterSet.kind) {
    case 'digit':
      matches = value >= ASCII_DIGIT_MIN && value <= ASCII_DIGIT_MAX;
      break;
    case 'space':
    case 'word':
      matches = false;
      break;
    case 'any':
      matches = true;
      break;
    default:
      if ('key' in characterSet && !characterSet.strings) {
        const property =
          characterSet.value === null
            ? characterSet.key
            : `${characterSet.key}=${characterSet.value}`;
        try {
          matches = new RegExp(String.raw`\p{${property}}`, 'u').test(String.fromCodePoint(value));
        } catch {
          matches = undefined;
        }
      } else {
        matches = undefined;
      }
  }
  if (matches === undefined) {
    return undefined;
  }
  return characterSet.kind === 'any' || !characterSet.negate ? matches : !matches;
}

export const rule: Rule.RuleModule = createRegExpRule(context => {
  return {
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
        !isOscTerminator(character)
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
