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
// https://sonarsource.github.io/rspec/#/rspec/S5868/javascript

import type { AST, Rule, SourceCode } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRegexLiteral } from '../helpers/ast.js';
import { RegExpValidator, type AST as RegexppAST } from '@eslint-community/regexpp';
import type estree from 'estree';
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

const MIN_HIGH_SURROGATE = 0xd800;
const MIN_LOW_SURROGATE = 0xdc00;
const MAX_LOW_SURROGATE_EXCLUSIVE = 0xe000;
const MIN_EMOJI_MODIFIER = 0x1f3fb;
const MAX_EMOJI_MODIFIER = 0x1f3ff;
const MIN_REGIONAL_INDICATOR = 0x1f1e6;
const MAX_REGIONAL_INDICATOR = 0x1f1ff;
const ZERO_WIDTH_JOINER = 0x200d;

export const rule: Rule.RuleModule = createRegExpRule(
  context => {
    let currentSeams: number[] = [];

    // Seam positions are in pattern space, while regexpp positions include the opening slash.
    // A pair straddles seam s when charA.start < s + 1 <= charB.start.
    function spansSeam(charA: RegexppAST.Character, charB: RegexppAST.Character): boolean {
      return currentSeams.some(s => charA.start <= s && s < charB.start);
    }

    function checkSequence(sequence: RegexppAST.Character[]) {
      // Stop on the first illegal character in the sequence
      for (let index = 0; index < sequence.length; index++) {
        if (checkCharacter(sequence[index], index, sequence)) {
          return;
        }
      }
    }

    function checkCharacter(
      character: RegexppAST.Character,
      index: number,
      characters: RegexppAST.Character[],
    ) {
      // Stop on the first failed check as there may be overlaps between checks
      // for instance a zero-width-sequence containing a modified emoji.
      for (const check of characterChecks) {
        if (check(character, index, characters)) {
          return true;
        }
      }
      return false;
    }

    function checkCombinedCharacter(
      character: RegexppAST.Character,
      index: number,
      characters: RegexppAST.Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        isCombiningCharacter(character.value) &&
        !isCombiningCharacter(characters[index - 1].value) &&
        !spansSeam(characters[index - 1], character)
      ) {
        const combinedChar = characters[index - 1].raw + characters[index].raw;
        const message = `Move this Unicode combined character '${combinedChar}' outside of the character class`;
        context.reportRegExpNode({ regexpNode: characters[index], node: context.node, message });
        reported = true;
      }
      return reported;
    }

    function checkSurrogatePairTailCharacter(
      character: RegexppAST.Character,
      index: number,
      characters: RegexppAST.Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        isSurrogatePair(characters[index - 1].value, character.value) &&
        !spansSeam(characters[index - 1], character)
      ) {
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

      const regExpConstructor = getRegExpConstructor(node, sourceCode);
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
      character: RegexppAST.Character,
      index: number,
      characters: RegexppAST.Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        isEmojiModifier(character.value) &&
        !isEmojiModifier(characters[index - 1].value) &&
        !spansSeam(characters[index - 1], character)
      ) {
        const modifiedEmoji = characters[index - 1].raw + characters[index].raw;
        const message = `Move this Unicode modified Emoji '${modifiedEmoji}' outside of the character class`;
        context.reportRegExpNode({ regexpNode: characters[index], node: context.node, message });
        reported = true;
      }
      return reported;
    }

    function checkRegionalIndicatorCharacter(
      character: RegexppAST.Character,
      index: number,
      characters: RegexppAST.Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        isRegionalIndicator(character.value) &&
        isRegionalIndicator(characters[index - 1].value) &&
        !spansSeam(characters[index - 1], character)
      ) {
        const regionalIndicator = characters[index - 1].raw + characters[index].raw;
        const message = `Move this Unicode regional indicator '${regionalIndicator}' outside of the character class`;
        context.reportRegExpNode({ regexpNode: characters[index], node: context.node, message });
        reported = true;
      }
      return reported;
    }

    function checkZeroWidthJoinerCharacter(
      character: RegexppAST.Character,
      index: number,
      characters: RegexppAST.Character[],
    ) {
      let reported = false;
      if (
        index !== 0 &&
        index !== characters.length - 1 &&
        isZeroWidthJoiner(character.value) &&
        !isZeroWidthJoiner(characters[index - 1].value) &&
        !isZeroWidthJoiner(characters[index + 1].value) &&
        !spansSeam(characters[index - 1], character) &&
        !spansSeam(character, characters[index + 1])
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
        validator.validatePattern(pattern, undefined, undefined, { unicode: true });
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
        currentSeams = getPatternFromNode(context.node, context)?.seams ?? [];
        for (const chars of characters(ccNode.elements)) {
          checkSequence(chars);
        }
      },
    };
  },
  generateMeta(meta, { hasSuggestions: true }),
);

function characters(nodes: RegexppAST.CharacterClassElement[]): RegexppAST.Character[][] {
  let current: RegexppAST.Character[] = [];
  const sequences: RegexppAST.Character[][] = [current];
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
  return (
    lead >= MIN_HIGH_SURROGATE &&
    lead < MIN_LOW_SURROGATE &&
    tail >= MIN_LOW_SURROGATE &&
    tail < MAX_LOW_SURROGATE_EXCLUSIVE
  );
}

function isEmojiModifier(code: number) {
  return code >= MIN_EMOJI_MODIFIER && code <= MAX_EMOJI_MODIFIER;
}

function isRegionalIndicator(code: number) {
  return code >= MIN_REGIONAL_INDICATOR && code <= MAX_REGIONAL_INDICATOR;
}

function isZeroWidthJoiner(code: number) {
  return code === ZERO_WIDTH_JOINER;
}

function getRegExpConstructor(
  node: estree.Node,
  sourceCode: SourceCode,
): estree.CallExpression | estree.NewExpression | undefined {
  const ancestors = sourceCode.getAncestors(node);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor && isRegExpConstructorCallOrNew(ancestor)) {
      return ancestor;
    }
  }
  return undefined;
}

function isRegExpConstructorCallOrNew(
  node: estree.Node,
): node is estree.CallExpression | estree.NewExpression {
  return isRegExpConstructor(node);
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
