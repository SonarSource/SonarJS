/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5868/javascript

import { AST, Rule } from 'eslint';
import { ancestorsChain, generateMeta, isRegexLiteral } from '../helpers/index.js';
import { RegExpValidator } from '@eslint-community/regexpp';
import { Character, CharacterClassElement } from '@eslint-community/regexpp/ast';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';
import { getPatternFromNode } from '../helpers/regex/extract.js';
import { getFlags } from '../helpers/regex/flags.js';
import { createRegExpRule } from '../helpers/regex/rule-template.js';
import { isRegExpConstructor } from '../helpers/regex/ast.js';

const MODIFIABLE_REGEXP_FLAGS_TYPES = new Set([
  'Literal',
  'TemplateLiteral',
  'TaggedTemplateExpression',
]);

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    function checkSequence(sequence: Character[]) {
      // Stop on the first illegal character in the sequence
      for (let index = 0; index < sequence.length; index++) {
        if (checkCharacter(sequence[index], index, sequence)) {
          return;
        }
      }
    }

    function checkCharacter(character: Character, index: number, characters: Character[]) {
      // Stop on the first failed check as there may be overlaps between checks
      // for instance a zero-width-sequence containing a modified emoji.
      for (const check of characterChecks) {
        if (check(character, index, characters)) {
          return true;
        }
      }
      return false;
    }

    function checkCombinedCharacter(character: Character, index: number, characters: Character[]) {
      let reported = false;
      if (
        index !== 0 &&
        isCombiningCharacter(character.value) &&
        !isCombiningCharacter(characters[index - 1].value)
      ) {
        const combinedChar = characters[index - 1].raw + characters[index].raw;
        const message = `Move this Unicode combined character '${combinedChar}' outside of the character class`;
        context.reportRegExpNode({ regexpNode: characters[index], node: context.node, message });
        reported = true;
      }
      return reported;
    }

    function checkSurrogatePairTailCharacter(
      character: Character,
      index: number,
      characters: Character[],
    ) {
      let reported = false;
      if (index !== 0 && isSurrogatePair(characters[index - 1].value, character.value)) {
        const surrogatePair = characters[index - 1].raw + characters[index].raw;
        const message = `Move this Unicode surrogate pair '${surrogatePair}' outside of the character class or use 'u' flag`;
        const pattern = getPatternFromNode(context.node, context)?.pattern;
        let suggest: Rule.ReportDescriptorOptions['suggest'];

        if (pattern && isValidWithUnicodeFlag(pattern)) {
          suggest = [
            {
              desc: "Add unicode 'u' flag to regex",
              fix: fixer => addUnicodeFlag(fixer, context.node),
            },
          ];
        }

        context.reportRegExpNode({
          regexpNode: characters[index],
          node: context.node,
          message,
          suggest,
        });
        reported = true;
      }
      return reported;
    }

    function addUnicodeFlag(fixer: Rule.RuleFixer, node: estree.Node) {
      if (isRegexLiteral(node)) {
        return insertTextAfter(fixer, node, 'u');
      }

      const regExpConstructor = getRegExpConstructor(node);
      if (!regExpConstructor) {
        return null;
      }

      const args = regExpConstructor.arguments;
      if (args.length === 1) {
        const token = sourceCode.getLastToken(regExpConstructor, { skip: 1 });
        return insertTextAfter(fixer, token, ', "u"');
      }

      if (args.length > 1 && args[1]?.range && hasModifiableFlags(regExpConstructor)) {
        const [start, end] = args[1].range;
        return fixer.insertTextAfterRange([start, end - 1], 'u');
      }

      return null;
    }

    function checkModifiedEmojiCharacter(
      character: Character,
      index: number,
      characters: Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        isEmojiModifier(character.value) &&
        !isEmojiModifier(characters[index - 1].value)
      ) {
        const modifiedEmoji = characters[index - 1].raw + characters[index].raw;
        const message = `Move this Unicode modified Emoji '${modifiedEmoji}' outside of the character class`;
        context.reportRegExpNode({ regexpNode: characters[index], node: context.node, message });
        reported = true;
      }
      return reported;
    }

    function checkRegionalIndicatorCharacter(
      character: Character,
      index: number,
      characters: Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        isRegionalIndicator(character.value) &&
        isRegionalIndicator(characters[index - 1].value)
      ) {
        const regionalIndicator = characters[index - 1].raw + characters[index].raw;
        const message = `Move this Unicode regional indicator '${regionalIndicator}' outside of the character class`;
        context.reportRegExpNode({ regexpNode: characters[index], node: context.node, message });
        reported = true;
      }
      return reported;
    }

    function checkZeroWidthJoinerCharacter(
      character: Character,
      index: number,
      characters: Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        index !== characters.length - 1 &&
        isZeroWidthJoiner(character.value) &&
        !isZeroWidthJoiner(characters[index - 1].value) &&
        !isZeroWidthJoiner(characters[index + 1].value)
      ) {
        // It's practically difficult to determine the full joined character sequence
        // as it may join more than 2 elements that consist of characters or modified Emojis
        // see: https://unicode.org/emoji/charts/emoji-zwj-sequences.html
        const message =
          'Move this Unicode joined character sequence outside of the character class';
        context.reportRegExpNode({
          regexpNode: characters[index - 1],
          node: context.node,
          message,
        });
        reported = true;
      }
      return reported;
    }

    function isValidWithUnicodeFlag(pattern: string) {
      try {
        validator.validatePattern(pattern, undefined, undefined, true);
        return true;
      } catch {
        return false;
      }
    }

    const sourceCode = context.sourceCode;
    const validator = new RegExpValidator();

    // The order matters as surrogate pair check may trigger at the same time as zero-width-joiner.
    const characterChecks = [
      checkCombinedCharacter,
      checkZeroWidthJoinerCharacter,
      checkModifiedEmojiCharacter,
      checkRegionalIndicatorCharacter,
      checkSurrogatePairTailCharacter,
    ];

    return {
      onCharacterClassEnter(ccNode) {
        for (const chars of characters(ccNode.elements)) {
          checkSequence(chars);
        }
      },
    };
  },
  generateMeta(meta, { hasSuggestions: true }),
);

function characters(nodes: CharacterClassElement[]): Character[][] {
  let current: Character[] = [];
  const sequences: Character[][] = [current];
  for (const node of nodes) {
    if (node.type === 'Character') {
      current.push(node);
    } else if (node.type === 'CharacterClassRange') {
      // for following regexp [xa-z] we produce [[xa],[z]]
      // we would report for example if instead of 'xa' there would be unicode combined class
      current.push(node.min);
      current = [node.max];
      sequences.push(current);
    } else if (node.type === 'CharacterSet' && current.length > 0) {
      // CharacterSet is for example [\d], ., or \p{ASCII}
      // see https://github.com/mysticatea/regexpp/blob/master/src/ast.ts#L222
      current = [];
      sequences.push(current);
    }
  }
  return sequences;
}

function isCombiningCharacter(codePoint: number) {
  return /^[\p{Mc}\p{Me}\p{Mn}]$/u.test(String.fromCodePoint(codePoint));
}

function isSurrogatePair(lead: number, tail: number) {
  return lead >= 0xd800 && lead < 0xdc00 && tail >= 0xdc00 && tail < 0xe000;
}

function isEmojiModifier(code: number) {
  return code >= 0x1f3fb && code <= 0x1f3ff;
}

function isRegionalIndicator(code: number) {
  return code >= 0x1f1e6 && code <= 0x1f1ff;
}

function isZeroWidthJoiner(code: number) {
  return code === 0x200d;
}

function getRegExpConstructor(node: estree.Node) {
  return ancestorsChain(node as TSESTree.Node, new Set(['CallExpression', 'NewExpression'])).find(
    n => isRegExpConstructor(n as estree.Node),
  ) as estree.CallExpression | estree.NewExpression | undefined;
}

function hasModifiableFlags(regExpConstructor: estree.CallExpression | estree.NewExpression) {
  const args = regExpConstructor.arguments;
  return (
    typeof args[1]?.range?.[0] === 'number' &&
    typeof args[1]?.range?.[1] === 'number' &&
    getFlags(regExpConstructor) != null &&
    MODIFIABLE_REGEXP_FLAGS_TYPES.has(args[1].type)
  );
}

function insertTextAfter(
  fixer: Rule.RuleFixer,
  node: estree.Node | AST.Token | null,
  text: string,
) {
  return node ? fixer.insertTextAfter(node, text) : null;
}
