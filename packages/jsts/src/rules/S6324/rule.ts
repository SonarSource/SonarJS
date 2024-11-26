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
// https://sonarsource.github.io/rspec/#/rspec/S6324/javascript

import type { Rule } from 'eslint';
import { Character } from '@eslint-community/regexpp/ast';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

const EXCEPTIONS = ['\t', '\n'];

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onCharacterEnter: (character: Character) => {
        const { value, raw } = character;
        if (
          value >= 0x00 &&
          value <= 0x1f &&
          (isSameInterpreted(raw, value) || raw.startsWith('\\x') || raw.startsWith('\\u')) &&
          !EXCEPTIONS.includes(raw)
        ) {
          context.reportRegExpNode({
            message: 'Remove this control character.',
            node: context.node,
            regexpNode: character,
          });
        }
      },
    };
  },
  generateMeta(meta as Rule.RuleMetaData),
);

/**
 * When the character has been interpreted, we need to compare its
 * code point value.
 */
function isSameInterpreted(raw: string, value: number) {
  return raw.codePointAt(0) === value;
}
