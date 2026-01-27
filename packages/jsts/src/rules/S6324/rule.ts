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

/**
 * Control characters used as range boundaries (e.g., [\x00-\x1f]) indicate intentional usage.
 */
function isCharacterClassRangeBoundary(character: AST.Character): boolean {
  return character.parent.type === 'CharacterClassRange';
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
        !isCharacterClassRangeBoundary(character)
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
