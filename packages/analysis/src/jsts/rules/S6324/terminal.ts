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
import { visitRegExpAST, type AST } from '@eslint-community/regexpp';
import { expandRegexAlternatives } from '../helpers/regex/expansion.js';
import { isSubsetOfCharacterRange } from '../helpers/regex/character-class.js';

const ESC = 0x1b;
const BEL = 0x07;
const C1_OSC = 0x9d;
const C1_ST = 0x9c;
const LEFT_BRACKET = 0x5b;
const RIGHT_BRACKET = 0x5d;
const BACKSLASH = 0x5c;
const SEMICOLON = 0x3b;
const DIGIT_ZERO = 0x30;
const DIGIT_NINE = 0x39;
const SPACE = 0x20;
const TILDE = 0x7e;
const MAX_CODE_POINT = 0x10ffff;
const MAX_CODE_UNIT = 0xffff;
const MAX_VALUES = 128;
const MAX_PARAMETER_LENGTH = 64;
const MAX_FINITE_REPETITION = 3;
const MAX_ERASE_DISPLAY_MODE = 3;
const MAX_ERASE_LINE_MODE = 2;
const CURSOR_COMMANDS = new Set('ABCDEFG');
const TITLE_COMMANDS = new Set('012');

// https://invisible-island.net/xterm/ctlseqs/ctlseqs.html
const SGR_PARAMETERS = new Set(
  '0 1 2 3 4 5 7 8 9 21 22 23 24 25 27 28 29 30 31 32 33 34 35 36 37 39 40 41 42 43 44 45 46 47 49 90 91 92 93 94 95 96 97 100 101 102 103 104 105 106 107'.split(
    ' ',
  ),
);

/** Adds exceptions only when every path containing a control proves its documented role. */
export function documentedTerminalControls(pattern: AST.Pattern): Set<AST.Character> {
  const accepted = new Set<AST.Character>();
  if (!pattern.parent || pattern.parent.flags.ignoreCase) {
    return accepted;
  }
  const scopes = terminalScopes(pattern);
  if (!scopes) {
    return accepted;
  }
  const maximumCodePoint =
    pattern.parent.flags.unicode || pattern.parent.flags.unicodeSets
      ? MAX_CODE_POINT
      : MAX_CODE_UNIT;
  for (const alternatives of scopes) {
    const paths = expandRegexAlternatives(alternatives);
    if (paths) {
      for (const character of controlsInEveryPath(paths, maximumCodePoint)) {
        accepted.add(character);
      }
    }
  }
  return accepted;
}

function terminalScopes(pattern: AST.Pattern): (readonly AST.Alternative[])[] | null {
  let unsupported = false;
  let hasControl = false;
  const scopes: (readonly AST.Alternative[])[] = [pattern.alternatives];
  visitRegExpAST(pattern, {
    onCharacterEnter: character => {
      hasControl ||= character.value === ESC || character.value === BEL;
    },
    onBackreferenceEnter: () => {
      unsupported = true;
    },
    onModifiersEnter: () => {
      unsupported = true;
    },
    onQuantifierEnter: quantifier => {
      const { element } = quantifier;
      if (
        (element.type === 'Group' || element.type === 'CapturingGroup') &&
        (quantifier.min !== 1 || quantifier.max !== 1) &&
        !isInAssertion(quantifier)
      ) {
        scopes.push(element.alternatives);
      }
    },
  });
  return unsupported || !hasControl ? null : scopes;
}

function controlsInEveryPath(paths: AST.Element[][], maximumCodePoint: number): AST.Character[] {
  const rejected = new Set<AST.Character>();
  const candidates = new Set<AST.Character>();
  for (const path of paths) {
    const proven = controlsInPath(path, maximumCodePoint);
    for (const element of path) {
      if (element.type === 'Character' && (element.value === ESC || element.value === BEL)) {
        (proven.has(element) ? candidates : rejected).add(element);
      }
    }
  }
  return [...candidates].filter(character => !rejected.has(character));
}

function isInAssertion(node: AST.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'Assertion') {
      return true;
    }
  }
  return false;
}

function controlsInPath(
  elements: readonly AST.Element[],
  maximumCodePoint: number,
): Set<AST.Character> {
  const controls = new Set<AST.Character>();
  for (let index = 0; index < elements.length; index++) {
    const first = elements[index];
    if (
      isCharacter(first, ESC) &&
      isCharacter(elements[index + 1], LEFT_BRACKET) &&
      hasCsiCommand(elements, index + 2, maximumCodePoint)
    ) {
      controls.add(first);
    }
    for (const character of oscControls(elements, index, maximumCodePoint)) {
      controls.add(character);
    }
  }
  return controls;
}

function oscControls(
  elements: readonly AST.Element[],
  index: number,
  maximumCodePoint: number,
): AST.Character[] {
  const first = elements[index];
  let payloadIndex: number;
  if (isCharacter(first, C1_OSC)) {
    payloadIndex = index + 1;
  } else if (isCharacter(first, ESC) && isCharacter(elements[index + 1], RIGHT_BRACKET)) {
    payloadIndex = index + 2;
  } else {
    return [];
  }
  const terminator = oscTerminator(elements, payloadIndex, maximumCodePoint);
  if (!terminator) {
    return [];
  }
  const controls: AST.Character[] = [];
  if (isCharacter(first, ESC)) {
    controls.push(first);
  }
  if (terminator.value === ESC || terminator.value === BEL) {
    controls.push(terminator);
  }
  return controls;
}

function hasCsiCommand(
  elements: readonly AST.Element[],
  start: number,
  maximumCodePoint: number,
): boolean {
  let end = start;
  while (
    end < elements.length &&
    (isDecimal(elements[end], maximumCodePoint) || isCharacter(elements[end], SEMICOLON))
  ) {
    end++;
  }
  const final = elements[end];
  if (final?.type !== 'Character') {
    return false;
  }
  const parameters = elements.slice(start, end);
  const command = String.fromCodePoint(final.value);
  const separators = parameters.filter(element => isCharacter(element, SEMICOLON)).length;
  if (CURSOR_COMMANDS.has(command)) {
    return separators === 0;
  }
  if (command === 'H' || command === 'f') {
    return separators <= 1;
  }
  const values = parameterValues(parameters);
  if (!values) {
    return false;
  }
  if (command === 'J' || command === 'K') {
    const maximum = command === 'J' ? MAX_ERASE_DISPLAY_MODE : MAX_ERASE_LINE_MODE;
    return values.every(value => !value.includes(';') && Number(value) <= maximum);
  }
  return (
    command === 'm' &&
    values.every(value =>
      value.split(';').every(parameter => SGR_PARAMETERS.has(String(Number(parameter)))),
    )
  );
}

function oscTerminator(
  elements: readonly AST.Element[],
  start: number,
  maximumCodePoint: number,
): AST.Character | undefined {
  const command = elements[start];
  if (
    command?.type !== 'Character' ||
    !TITLE_COMMANDS.has(String.fromCodePoint(command.value)) ||
    !isCharacter(elements[start + 1], SEMICOLON)
  ) {
    return undefined;
  }
  let end = start + 2;
  while (end < elements.length && isPrintable(elements[end], maximumCodePoint)) {
    end++;
  }
  const terminator = elements[end];
  if (
    isCharacter(terminator, BEL) ||
    isCharacter(terminator, C1_ST) ||
    (isCharacter(terminator, ESC) && isCharacter(elements[end + 1], BACKSLASH))
  ) {
    return terminator;
  }
  return undefined;
}

function isCharacter(element: AST.Element | undefined, value: number): element is AST.Character {
  return element?.type === 'Character' && element.value === value;
}

function isDecimal(element: AST.Element, maximumCodePoint: number): boolean {
  if (element.type === 'Quantifier') {
    return isDecimal(element.element, maximumCodePoint);
  }
  if (element.type === 'CharacterSet') {
    return element.kind === 'digit' && !element.negate;
  }
  return isSubsetOfCharacterRange(element, DIGIT_ZERO, DIGIT_NINE, maximumCodePoint);
}

function isPrintable(element: AST.Element, maximumCodePoint: number): boolean {
  return element.type === 'Quantifier'
    ? isPrintable(element.element, maximumCodePoint)
    : isSubsetOfCharacterRange(element, SPACE, TILDE, maximumCodePoint);
}

function parameterValues(elements: readonly AST.Element[]): string[] | null {
  let values = [''];
  for (const element of elements) {
    const choices = decimalValues(element);
    if (!choices?.length || values.length * choices.length > MAX_VALUES) {
      return null;
    }
    const next = concatenateValues(values, choices);
    if (!next) {
      return null;
    }
    values = next;
  }
  return values;
}

function concatenateValues(prefixes: string[], suffixes: string[]): string[] | null {
  const values: string[] = [];
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      if (prefix.length + suffix.length > MAX_PARAMETER_LENGTH) {
        return null;
      }
      values.push(prefix + suffix);
    }
  }
  return values;
}

function decimalValues(element: AST.Element): string[] | null {
  if (element.type === 'Character') {
    return [String.fromCodePoint(element.value)];
  }
  if (element.type === 'Quantifier') {
    if (element.max > MAX_FINITE_REPETITION) {
      return null;
    }
    const choices = decimalValues(element.element);
    if (!choices) {
      return null;
    }
    const values: string[] = [];
    let repeated = [''];
    for (let count = 0; count <= element.max; count++) {
      if (count >= element.min) {
        values.push(...repeated);
      }
      if (values.length > MAX_VALUES || repeated.length * choices.length > MAX_VALUES) {
        return null;
      }
      repeated = repeated.flatMap(prefix => choices.map(suffix => prefix + suffix));
    }
    return values;
  }
  if (element.type === 'CharacterSet' || element.type === 'CharacterClass') {
    // Every caller first proves that this atom consumes only decimal digits.
    return Array.from({ length: 10 }, (_, digit) => String(digit)).filter(digit => {
      if (element.type === 'CharacterSet') {
        return true;
      }
      const codePoint = digit.codePointAt(0) ?? -1;
      const included = element.elements.some(item =>
        item.type === 'Character'
          ? item.value === codePoint
          : item.type === 'CharacterClassRange' &&
            item.min.value <= codePoint &&
            codePoint <= item.max.value,
      );
      return element.negate ? !included : included;
    });
  }
  return null;
}
