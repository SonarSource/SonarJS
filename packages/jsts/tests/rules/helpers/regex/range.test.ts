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
import esprima from 'esprima';
import estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import type { Rule } from 'eslint';
import { SourceCode } from 'eslint';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { getRegexpRange } from '../../../../src/rules/helpers/regex/range.js';
import { getRegexpLocation } from '../../../../src/rules/helpers/regex/location.js';

describe('getRegexpRange', () => {
  it('should get range for regexp /s*', () => {
    const program = esprima.parse(`'/s*'`);
    const literal: estree.Literal = program.body[0].expression;
    const regexNode = regexpp.parseRegExpLiteral(new RegExp(literal.value as string));
    const quantifier = regexNode.pattern.alternatives[0].elements[1]; // s*
    const range = getRegexpRange(literal, quantifier);
    expect(range).toStrictEqual([2, 4]);
  });

  it('should get range for regexp |/?[a-z]', () => {
    const program = esprima.parse(`'|/?[a-z]'`);
    const literal: estree.Literal = program.body[0].expression;
    const regexNode = regexpp.parseRegExpLiteral(new RegExp(literal.value as string));
    const alternative = regexNode.pattern.alternatives[1]; // /?[a-z]
    const range = getRegexpRange(literal, alternative);
    expect(range).toStrictEqual([2, 9]);
  });

  it('should get range for \\ns', () => {
    const program = esprima.parse(`'\\ns'`, { range: true });
    const literal: estree.Literal = program.body[0].expression;
    const regexNode = regexpp.parseRegExpLiteral(new RegExp(literal.value as string));
    const quantifier = regexNode.pattern.alternatives[0].elements[1];
    const range = getRegexpRange(literal, quantifier);
    // this fails to compute, so we return range of the whole node
    expect(range).toStrictEqual([0, 5]);
  });

  it('should get range for template literal', () => {
    const program = esprima.parse('`\\ns`', { range: true });
    const literal: estree.TemplateLiteral = program.body[0].expression;
    const regexNode = regexpp.parseRegExpLiteral(new RegExp(literal.quasis[0].value.raw as string));
    const quantifier = regexNode.pattern.alternatives[0].elements[1];
    const range = getRegexpRange(literal, quantifier);
    // this fails to compute, so we return range of the whole node
    expect(range).toStrictEqual([0, 5]);
  });

  it('should throw for wrong node', () => {
    const program = esprima.parse(`'\\ns'`, { range: true });
    expect(() => {
      getRegexpRange(program, undefined);
    }).toThrow('Expected regexp or string literal, got Program');
  });

  it('should report correct range when fails to determine real range', () => {
    let code = `     '\\ns'`;
    const program = esprima.parse(code, { range: true, tokens: true, comment: true, loc: true });
    const literal: estree.Literal = program.body[0].expression;
    const regexNode = regexpp.parseRegExpLiteral(new RegExp(literal.value as string));
    const quantifier = regexNode.pattern.alternatives[0].elements[1];
    const context = {
      sourceCode: new SourceCode(code, program),
    };
    const range = getRegexpLocation(literal, quantifier, context as Rule.RuleContext);
    expect(range).toStrictEqual({
      start: { column: 5, line: 1 },
      end: { column: 10, line: 1 },
    });
  });
});
