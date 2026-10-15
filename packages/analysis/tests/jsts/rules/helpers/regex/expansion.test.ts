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
import { parseRegExpLiteral, visitRegExpAST, type AST } from '@eslint-community/regexpp';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { expandRegexAlternatives } from '../../../../../src/jsts/rules/helpers/regex/expansion.js';

describe('expandRegexAlternatives', () => {
  it('keeps original character nodes across expanded paths', () => {
    const pattern = parseRegExpLiteral('/a(?:b|c)(d){1}/').pattern;
    const characters: AST.Character[] = [];
    visitRegExpAST(pattern, { onCharacterEnter: character => characters.push(character) });
    const paths = expandRegexAlternatives(pattern.alternatives);
    deepStrictEqual(
      paths?.map(path => path.map(element => element.raw)),
      [
        ['a', 'b', 'd'],
        ['a', 'c', 'd'],
      ],
    );
    strictEqual(paths?.[0][0], characters[0]);
    strictEqual(paths?.[1][0], characters[0]);
    strictEqual(paths?.[0][2], characters[3]);
    strictEqual(paths?.[1][2], characters[3]);
  });

  it('keeps repetitions, assertions, classes, and backreferences as atoms', () => {
    const pattern = parseRegExpLiteral(String.raw`/(a)?(?=b)[c]\1/`).pattern;
    const elements = pattern.alternatives[0].elements;
    const paths = expandRegexAlternatives(pattern.alternatives);
    strictEqual(paths?.length, 1);
    for (const [index, element] of elements.entries()) {
      strictEqual(paths?.[0][index], element);
    }
  });

  it('keeps empty alternatives', () => {
    const pattern = parseRegExpLiteral('/(?:a|)/').pattern;
    const paths = expandRegexAlternatives(pattern.alternatives);
    deepStrictEqual(
      paths?.map(path => path.map(element => element.raw)),
      [['a'], []],
    );
  });

  for (const [name, source, expectedLength] of [
    ['allows 64 alternative paths', Array(64).fill('a').join('|'), 64],
    ['rejects 65 alternative paths', Array(65).fill('a').join('|'), undefined],
    ['allows 64 combined paths', '(?:a|b)'.repeat(6), 64],
    ['rejects 128 combined paths', '(?:a|b)'.repeat(7), undefined],
    ['allows 256 elements', 'a'.repeat(256), 1],
    ['rejects 257 elements', 'a'.repeat(257), undefined],
    ['allows depth 16', '(?:'.repeat(16) + 'a' + ')'.repeat(16), 1],
    ['rejects depth 17', '(?:'.repeat(17) + 'a' + ')'.repeat(17), undefined],
  ] as const) {
    it(name, () => {
      const pattern = parseRegExpLiteral(`/${source}/`).pattern;
      const paths = expandRegexAlternatives(pattern.alternatives);
      if (expectedLength === undefined) {
        strictEqual(paths, null);
      } else {
        strictEqual(paths?.length, expectedLength);
      }
    });
  }
});
