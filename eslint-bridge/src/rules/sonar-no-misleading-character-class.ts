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
// https://sonarsource.github.io/rspec/#/rspec/S5868

import { Rule } from 'eslint';
import { createRegExpRule } from './regex-rule-template';
import { Character, CharacterClassElement } from 'regexpp/ast';
import {
  isCombiningCharacter,
  isEmojiModifier,
  isRegionalIndicatorSymbol,
  isSurrogatePair,
} from '../utils/utils-unicode';

export const rule: Rule.RuleModule = createRegExpRule(context => {
  function* iterateCharacterSequence(nodes: CharacterClassElement[]) {
    let seq: Character[] = [];

    for (const node of nodes) {
      switch (node.type) {
        case 'Character':
          seq.push(node);
          break;

        case 'CharacterClassRange':
          seq.push(node.min);
          yield seq;
          seq = [node.max];
          break;

        case 'CharacterSet':
          if (seq.length > 0) {
            yield seq;
            seq = [];
          }
          break;

        // no default
      }
    }

    if (seq.length > 0) {
      yield seq;
    }
  }

  function surrogatePairWithoutUFlag(chars: Character[]) {
    return chars.find((c, i) => i !== 0 && isSurrogatePair(chars[i - 1].value, c.value));
  }

  function combiningClass(chars: Character[]) {
    return chars.find(
      (c, i) =>
        i !== 0 && isCombiningCharacter(c.value) && !isCombiningCharacter(chars[i - 1].value),
    );
  }

  function emojiModifier(chars: Character[]) {
    return chars.find(
      (c, i) => i !== 0 && isEmojiModifier(c.value) && !isEmojiModifier(chars[i - 1].value),
    );
  }

  function regionalIndicatorSymbol(chars: Character[]) {
    return chars.find(
      (c, i) =>
        i !== 0 &&
        isRegionalIndicatorSymbol(c.value) &&
        isRegionalIndicatorSymbol(chars[i - 1].value),
    );
  }

  function joinedCharacterSeq(chars: Character[]) {
    const lastIndex = chars.length - 1;

    return chars.find(
      (c, i) =>
        i !== 0 &&
        i !== lastIndex &&
        c.value === 0x200d &&
        chars[i - 1].value !== 0x200d &&
        chars[i + 1].value !== 0x200d,
    );
  }

  function testChars(
    test: (chars: Character[]) => Character | undefined,
    chars: Character[],
    message: string,
  ) {
    const regexpNode = test(chars);
    if (regexpNode !== undefined) {
      context.reportRegExpNode({
        regexpNode,
        message,
        node: context.node,
      });
    }
  }

  return {
    onCharacterClassEnter(ccNode) {
      for (const chars of iterateCharacterSequence(ccNode.elements)) {
        testChars(
          surrogatePairWithoutUFlag,
          chars,
          "Unexpected surrogate pair in character class. Use 'u' flag.",
        );
        testChars(combiningClass, chars, 'Unexpected combined character in character class.');
        testChars(emojiModifier, chars, 'Unexpected modified Emoji in character class.');
        testChars(regionalIndicatorSymbol, chars, 'Unexpected national flag in character class.');
        testChars(
          joinedCharacterSeq,
          chars,
          'Unexpected joined character sequence in character class.',
        );
      }
    },
  };
});
