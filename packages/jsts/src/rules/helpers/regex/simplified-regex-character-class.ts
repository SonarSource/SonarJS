/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import {
  Character,
  CharacterClassElement,
  CharacterClassRange,
  CharacterSet,
  Flags,
  Node,
} from '@eslint-community/regexpp/ast';
import * as regexpp from '@eslint-community/regexpp';
import createTree from 'functional-red-black-tree';

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

  constructor(
    private readonly flags: Flags,
    element?: CharacterClassElement,
  ) {
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
