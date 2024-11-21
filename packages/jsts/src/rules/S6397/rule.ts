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
// https://sonarsource.github.io/rspec/#/rspec/S6397/javascript

import type { Rule } from 'eslint';
import { CharacterClass, CharacterClassElement } from '@eslint-community/regexpp/ast';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';

const FORBIDDEN_TYPES = [
  'EscapeCharacterSet',
  'UnicodePropertyCharacterSet',
  'Character',
  'CharacterSet',
];
const EXCEPTION_META_CHARACTERS = '[{(.?+*$^\\\\';

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    return {
      onCharacterClassEnter: (node: CharacterClass) => {
        if (hasSingleForbiddenCharacter(node.elements) && !node.negate) {
          context.reportRegExpNode({
            messageId: 'issue',
            node: context.node,
            regexpNode: node,
          });
        }
      },
    };
  },

  generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      issue: 'Replace this character class by the character itself.',
    },
  }),
);

function hasSingleForbiddenCharacter(elems: CharacterClassElement[]) {
  return (
    elems.length === 1 &&
    FORBIDDEN_TYPES.includes(elems[0].type) &&
    !EXCEPTION_META_CHARACTERS.includes(elems[0].raw)
  );
}
