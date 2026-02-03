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
// https://sonarsource.github.io/rspec/#/rspec/S6324/javascript

import type { Rule } from 'eslint';
import type { AST } from '@eslint-community/regexpp';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

const EXCEPTIONS = new Set(['\t', '\n']);

const MAX_CONTROL_CHAR_CODE = 0x1f;

// ANSI escape sequence control characters
const ESC = 0x1b;
const BEL = 0x07;
const LEFT_BRACKET = 0x5b; // [
const RIGHT_BRACKET = 0x5d; // ]

/**
 * Control characters used as range boundaries (e.g., [\x00-\x1f]) indicate intentional usage.
 */
function isCharacterClassRangeBoundary(character: AST.Character): boolean {
  return character.parent.type === 'CharacterClassRange';
}

/**
 * Control characters inside character classes that contain ranges indicate intentional
 * character set construction (e.g., [\x00-\x08\x0b\x0c] for YAML/CSS non-printables).
 */
function isInCharacterClassWithRanges(character: AST.Character): boolean {
  const parent = character.parent;
  if (parent.type !== 'CharacterClass') {
    return false;
  }
  return parent.elements.some(element => element.type === 'CharacterClassRange');
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
 * Checks if BEL (0x07) is used as OSC sequence terminator.
 * Per xterm spec, BEL is valid only as an OSC terminator (after ESC + ]).
 * It should NOT be exempted after CSI sequences (ESC + [).
 */
function isOscTerminator(character: AST.Character): boolean {
  if (character.value !== BEL) {
    return false;
  }
  const parent = character.parent;
  if (parent.type !== 'Alternative') {
    return false;
  }
  const elements = parent.elements;
  // Look backwards for ESC + ] pattern indicating OSC sequence start
  for (let i = elements.indexOf(character) - 1; i >= 1; i--) {
    const curr = elements[i];
    const prev = elements[i - 1];
    if (
      curr.type === 'Character' &&
      curr.value === RIGHT_BRACKET &&
      prev.type === 'Character' &&
      prev.value === ESC
    ) {
      return true;
    }
  }
  return false;
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
        !isInCharacterClassWithRanges(character) &&
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
