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

import * as estree from 'estree';
import * as regexpp from 'regexpp';
import {
  CapturingGroup,
  Character,
  CharacterClassElement,
  CharacterClassRange,
  CharacterSet,
  Flags,
  Group,
  LookaroundAssertion,
  Pattern,
  Node,
} from 'regexpp/ast';
import { AST, Rule } from 'eslint';
import {
  getUniqueWriteUsage,
  isBinaryPlus,
  isIdentifier,
  isRegexLiteral,
  isStaticTemplateLiteral,
  isStringLiteral,
} from './utils-ast';
import { ParserServices, TSESTree } from '@typescript-eslint/experimental-utils';
import createTree from 'functional-red-black-tree';
import { tokenizeString } from './utils-string-literal';
import { isString } from './utils-type';
import { last } from './utils-collection';
/**
 * An alternation is a regexpp node that has an `alternatives` field.
 */
export type Alternation = Pattern | CapturingGroup | Group | LookaroundAssertion;

export function getParsedRegex(
  node: estree.Node,
  context: Rule.RuleContext,
): regexpp.AST.RegExpLiteral | null {
  const patternAndFlags = getPatternFromNode(node, context);
  if (patternAndFlags) {
    try {
      return regexpp.parseRegExpLiteral(new RegExp(patternAndFlags.pattern, patternAndFlags.flags));
    } catch {
      // do nothing for invalid regex
    }
  }

  return null;
}

function getPatternFromNode(
  node: estree.Node,
  context: Rule.RuleContext,
): { pattern: string; flags: string } | null {
  if (isRegExpConstructor(node)) {
    const patternOnly = getPatternFromNode(node.arguments[0], context);
    const flags = getFlags(node);
    if (patternOnly && flags !== null) {
      return { pattern: patternOnly.pattern, flags };
    }
  } else if (isRegexLiteral(node)) {
    return node.regex;
  } else if (isStringLiteral(node)) {
    return { pattern: node.value as string, flags: '' };
  } else if (isStaticTemplateLiteral(node)) {
    return { pattern: node.quasis[0].value.raw, flags: '' };
  } else if (isIdentifier(node)) {
    const assignedExpression = getUniqueWriteUsage(context, node.name);
    if (
      assignedExpression &&
      (assignedExpression as TSESTree.Node).parent?.type === 'VariableDeclarator'
    ) {
      return getPatternFromNode(assignedExpression, context);
    }
  } else if (isBinaryPlus(node)) {
    const left = getPatternFromNode(node.left, context);
    const right = getPatternFromNode(node.right, context);
    if (left && right) {
      return { pattern: left.pattern + right.pattern, flags: '' };
    }
  }

  return null;
}

export function isRegExpConstructor(node: estree.Node): node is estree.CallExpression {
  return (
    (node.type === 'CallExpression' || node.type === 'NewExpression') &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'RegExp' &&
    node.arguments.length > 0
  );
}

export function getFlags(callExpr: estree.CallExpression): string | null {
  if (callExpr.arguments.length < 2) {
    return '';
  }
  const flags = callExpr.arguments[1];
  if (flags.type === 'Literal' && typeof flags.value === 'string') {
    return flags.value;
  }
  return null;
}

export function getRegexpLocation(
  node: estree.Node,
  regexpNode: regexpp.AST.Node,
  context: Rule.RuleContext,
  offset = [0, 0],
): AST.SourceLocation {
  let loc: AST.SourceLocation;
  if (isRegexLiteral(node) || isStringLiteral(node)) {
    const source = context.getSourceCode();
    const [start] = node.range!;
    const [reStart, reEnd] = getRegexpRange(node, regexpNode);
    loc = {
      start: source.getLocFromIndex(start + reStart + offset[0]),
      end: source.getLocFromIndex(start + reEnd + offset[1]),
    };
  } else {
    loc = node.loc!;
  }
  return loc;
}

function getRegexpRange(node: estree.Node, regexpNode: regexpp.AST.Node): AST.Range {
  if (isRegexLiteral(node)) {
    return [regexpNode.start, regexpNode.end];
  }
  if (isStringLiteral(node)) {
    if (node.value === '') {
      return [0, 2];
    }
    const s = node.raw!;
    const tokens = tokenizeString(unquote(s));
    if (regexpNode.start === regexpNode.end) {
      // this happens in case of empty alternative node like '|'
      if (regexpNode.start - 1 < tokens.length) {
        // '|' first empty alternative will have start = 1, end = 1
        // +1 is to account for string quote
        return [
          tokens[regexpNode.start - 1].range[0] + 1,
          tokens[regexpNode.start - 1].range[0] + 1,
        ];
      } else {
        // '|' second empty alternative regex node will have start = 2, end = 2
        // +1 is to account for string quote
        return [last(tokens).range[1] + 1, last(tokens).range[1] + 1];
      }
    }
    // regexpNode positions are 1 - based, we need to -1 to report as 0 - based
    // it's possible for node start to be outside of range, e.g. `a` in new RegExp('//a')
    const startToken = Math.min(regexpNode.start - 1, tokens.length - 1);
    const start = tokens[startToken].range[0];
    // it's possible for node end to be outside of range, e.g. new RegExp('\n(|)')
    const endToken = Math.min(regexpNode.end - 2, tokens.length - 1);
    const end = tokens[endToken].range[1];
    // +1 is needed to account for string quotes
    return [start + 1, end + 1];
  }
  throw new Error(`Expected regexp or string literal, got ${node.type}`);
}

function unquote(s: string): string {
  if (s.charAt(0) !== "'" && s.charAt(0) !== '"') {
    throw new Error(`invalid string to unquote: ${s}`);
  }
  return s.substring(1, s.length - 1);
}

export function isStringRegexMethodCall(call: estree.CallExpression, services: ParserServices) {
  return (
    call.callee.type === 'MemberExpression' &&
    call.callee.property.type === 'Identifier' &&
    !call.callee.computed &&
    ['match', 'matchAll', 'search'].includes(call.callee.property.name) &&
    call.arguments.length > 0 &&
    isString(call.callee.object, services) &&
    isString(call.arguments[0], services)
  );
}

const MAX_CODE_POINT = 0x10ffff;

export class SimplifiedRegexCharacterClass {
  /**
   * This map defines the contents of the character class in the following way:<br>
   * For any entry {@code codepoint -> tree}, all the codepoints from {@code codepoint} up to (and excluding) the next
   * entry are in the character class and belong to the given tree.<br>
   * For any entry {@code codepoint -> null}, all the codepoints from {@code codepoint} up to (and excluding) the next
   * entry are not part of the character class.<br>
   * So a codepoint is contained in this class if and only if {@code contents.le(codePoint).value} is
   * non-null and the tree returned by {@code value} will be the element of the character class which matches that
   * code point.
   */
  private contents = createTree<number, Node | undefined>();

  constructor(private readonly flags: Flags, element?: CharacterClassElement) {
    if (element) {
      this.add(element);
    }
  }

  public add(element: CharacterClassElement) {
    new SimplifiedRegexCharacterClass.Builder(this).visit(element);
  }

  public findIntersections(that: SimplifiedRegexCharacterClass) {
    const iter = that.contents.begin;
    const intersections: Node[] = [];
    if (iter.key === undefined) {
      return intersections;
    }
    while (iter.hasNext) {
      const { key, value } = iter;
      iter.next();
      const to = iter.value ? iter.key : iter.key - 1;
      if (value && this.hasEntryBetween(key, to)) {
        intersections.push(value);
      }
    }
    if (iter.value && this.hasEntryBetween(iter.key, MAX_CODE_POINT)) {
      intersections.push(iter.value);
    }
    return intersections;
  }

  hasEntryBetween(from: number, to: number) {
    const before = this.contents.le(from);
    return (before.key !== undefined && before.value) || !this.isRangeEmpty(from + 1, to + 1);
  }

  isRangeEmpty(from: number, to: number) {
    let isEmpty = true;
    this.contents.forEach(() => (isEmpty = false), from, to);
    return isEmpty;
  }

  addRange(from: number, to: number, element: CharacterClassElement) {
    const oldEntry = this.contents.le(to);
    const oldEnd = oldEntry.key === undefined ? undefined : this.contents.gt(oldEntry.key).key;
    this.contents = this.put(from, element, this.contents);
    const iterator = this.contents.begin;
    while (iterator.key !== undefined) {
      if (iterator.key > from && iterator.key <= to && iterator.value === undefined) {
        this.contents = iterator.update(element);
      }
      iterator.next();
    }
    const next = to + 1;
    if (next <= MAX_CODE_POINT) {
      if (oldEntry.key !== undefined && oldEntry.value && (oldEnd === undefined || oldEnd > next)) {
        this.contents = this.put(next, oldEntry.value, this.contents);
      } else if (this.contents.find(next).key === undefined) {
        this.contents = this.put(next, undefined, this.contents);
      }
    }
  }

  put(
    key: number,
    value: Node | undefined,
    tree: createTree.Tree<number, regexpp.AST.Node | undefined>,
  ) {
    const entry = tree.find(key);
    if (entry.valid) {
      return entry.update(value);
    }
    return tree.insert(key, value);
  }

  private static readonly Builder = class {
    constructor(private readonly characters: SimplifiedRegexCharacterClass) {}

    public visit(element: CharacterClassElement) {
      switch (element.type) {
        case 'Character':
          this.visitCharacter(element);
          break;
        case 'CharacterClassRange':
          this.visitCharacterClassRange(element);
          break;
        case 'CharacterSet':
          this.visitCharacterSet(element);
          break;
      }
    }

    visitCharacter(character: Character) {
      this.addRange(character.value, character.value, character);
    }

    visitCharacterClassRange(characterRange: CharacterClassRange) {
      this.addRange(characterRange.min.value, characterRange.max.value, characterRange);
    }

    visitCharacterSet(characterSet: CharacterSet) {
      switch (characterSet.kind) {
        case 'digit':
          if (characterSet.negate) {
            this.characters.addRange(0x00, this.codePoint('0') - 1, characterSet);
            if (this.characters.flags.unicode) {
              this.characters.addRange(this.codePoint('9') + 1, 0xff, characterSet);
            } else {
              this.characters.addRange(this.codePoint('9') + 1, MAX_CODE_POINT, characterSet);
            }
          } else {
            this.characters.addRange(this.codePoint('0'), this.codePoint('9'), characterSet);
          }
          break;
        case 'space':
          if (characterSet.negate) {
            this.characters.addRange(0x00, this.codePoint('\t') - 1, characterSet);
            this.characters.addRange(
              this.codePoint('\r') + 1,
              this.codePoint(' ') - 1,
              characterSet,
            );
            if (this.characters.flags.unicode) {
              this.characters.addRange(this.codePoint(' ') + 1, 0x84, characterSet);
              this.characters.addRange(0x86, 0x9f, characterSet);
              this.characters.addRange(0xa1, 0x167f, characterSet);
              this.characters.addRange(0x1681, 0x1fff, characterSet);
              this.characters.addRange(0x200b, 0x2027, characterSet);
              this.characters.addRange(0x202a, 0x202e, characterSet);
              this.characters.addRange(0x2030, 0x205e, characterSet);
              this.characters.addRange(0x2060, 0x2fff, characterSet);
              this.characters.addRange(0x3001, MAX_CODE_POINT, characterSet);
            } else {
              this.characters.addRange(this.codePoint(' ') + 1, MAX_CODE_POINT, characterSet);
            }
          } else {
            this.characters.addRange(this.codePoint('\t'), this.codePoint('\r'), characterSet);
            this.characters.addRange(this.codePoint(' '), this.codePoint(' '), characterSet);
            if (this.characters.flags.unicode) {
              this.characters.addRange(0x85, 0x85, characterSet);
              this.characters.addRange(0xa0, 0xa0, characterSet);
              this.characters.addRange(0x1680, 0x1680, characterSet);
              this.characters.addRange(0x2000, 0x200a, characterSet);
              this.characters.addRange(0x2028, 0x2029, characterSet);
              this.characters.addRange(0x202f, 0x202f, characterSet);
              this.characters.addRange(0x205f, 0x205f, characterSet);
              this.characters.addRange(0x3000, 0x3000, characterSet);
            }
          }
          break;
        case 'word':
          if (characterSet.negate) {
            this.characters.addRange(0x00, this.codePoint('0') - 1, characterSet);
            this.characters.addRange(
              this.codePoint('9') + 1,
              this.codePoint('A') - 1,
              characterSet,
            );
            this.characters.addRange(
              this.codePoint('Z') + 1,
              this.codePoint('_') - 1,
              characterSet,
            );
            this.characters.addRange(this.codePoint('`'), this.codePoint('`'), characterSet);
            if (this.characters.flags.unicode) {
              this.characters.addRange(
                this.codePoint('z') + 1,
                this.codePoint('µ') - 1,
                characterSet,
              );
            } else {
              this.characters.addRange(this.codePoint('z') + 1, MAX_CODE_POINT, characterSet);
            }
          } else {
            this.characters.addRange(this.codePoint('0'), this.codePoint('9'), characterSet);
            this.characters.addRange(this.codePoint('A'), this.codePoint('Z'), characterSet);
            this.characters.addRange(this.codePoint('_'), this.codePoint('_'), characterSet);
            this.characters.addRange(this.codePoint('a'), this.codePoint('z'), characterSet);
          }
          break;
      }
    }

    addRange(from: number, to: number, element: CharacterClassElement) {
      const upperCaseFrom = this.codePoint(String.fromCodePoint(from).toUpperCase());
      const upperCaseTo = this.codePoint(String.fromCodePoint(to).toUpperCase());
      const lowerCaseFrom = this.codePoint(String.fromCodePoint(upperCaseFrom).toLowerCase());
      const lowerCaseTo = this.codePoint(String.fromCodePoint(upperCaseTo).toLowerCase());
      if (
        this.characters.flags.ignoreCase &&
        lowerCaseFrom !== upperCaseFrom &&
        lowerCaseTo !== upperCaseTo &&
        ((this.isAscii(from) && this.isAscii(to)) || this.characters.flags.unicode)
      ) {
        this.characters.addRange(upperCaseFrom, upperCaseTo, element);
        this.characters.addRange(lowerCaseFrom, lowerCaseTo, element);
      } else {
        this.characters.addRange(from, to, element);
      }
    }

    isAscii(c: number) {
      return c < 128;
    }

    codePoint(c: string) {
      const cp = c.codePointAt(0);
      if (cp === undefined) {
        throw new Error(`failed to compute code point for: ${c}`);
      }
      return cp;
    }
  };
}
