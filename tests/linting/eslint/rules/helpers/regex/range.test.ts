/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import * as esprima from 'esprima';
import * as estree from 'estree';
import { getRegexpLocation, getRegexpRange } from '@sonar/jsts/rules/helpers/regex';
import * as regexpp from 'regexpp';
import { Rule, SourceCode } from 'eslint';
import RuleContext = Rule.RuleContext;

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
      getSourceCode() {
        return new SourceCode(code, program);
      },
    };
    const range = getRegexpLocation(literal, quantifier, context as RuleContext);
    expect(range).toStrictEqual({
      start: { column: 5, line: 1 },
      end: { column: 10, line: 1 },
    });
  });
});
