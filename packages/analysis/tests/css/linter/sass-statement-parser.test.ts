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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import postcss from 'postcss';
import { SassStatementScanner } from '../../../src/css/linter/sass/sass-statement-scanner.js';
import { SassStatementParser } from '../../../src/css/linter/sass/sass-statement-parser.js';
import type { SassStatement } from '../../../src/css/linter/sass/sass-statement.js';

function scan(code: string): SassStatement[] {
  const scanner = new SassStatementScanner(new postcss.Input(code));
  const statements: SassStatement[] = [];
  let line;
  while ((line = scanner.peekLine())) statements.push(scanner.readStatement(line));
  return statements;
}

describe('Sass statement scanning', () => {
  for (const header of [
    String.raw`content: "Say \"hello\" ( // :"`,
    "content: '/* [ ) : // text'",
    'color: /* " ] ) : */ red',
    'background: url(//cdn.example/image.svg)',
    'background: url("https://example.test/a(b).svg")',
    '#{map.get((name: x), name)}: red',
  ]) {
    it(`keeps punctuation in its lexical context: ${header}`, () => {
      const code = `${header}\nheight: 1px\n`;
      expect(scan(code)).toMatchObject([
        { type: 'decl', start: 0, end: header.length, headerEnd: header.length },
        { type: 'decl', start: header.length + 1 },
      ]);
    });
  }

  it('resumes code after a line comment inside a multiline value', () => {
    const header = '$map: (\n  // " ) ] are comment text\n  color: red,\n)';
    const code = `${header}\n$next: 1\n`;
    expect(scan(code)).toMatchObject([
      { type: 'decl', end: header.length, trailingComment: undefined },
      { type: 'decl', start: header.length + 1 },
    ]);
  });

  it('finds statement boundaries without attaching or validating indentation', () => {
    const code = 'a\n    color: red\n  width: 1px\n';
    const statements = scan(code);
    expect(statements.map(({ start, end }) => code.slice(start, end))).toEqual([
      'a',
      'color: red',
      'width: 1px',
    ]);
    expect(statements.every(statement => statement.nodes === undefined)).toBe(true);
    expect(() => new SassStatementParser(new postcss.Input(code)).parse()).toThrow(
      expect.objectContaining({ reason: 'Inconsistent indentation.', line: 3, column: 3 }),
    );
  });

  for (const [code, reason] of [
    ['content: "unfinished', 'Unclosed string.'],
    ['color: /* unfinished', 'Unclosed comment.'],
    ['width: (1px', 'expected ")".'],
    ['width: ([)]', 'Unexpected ")".'],
  ]) {
    it(`reports a lexical error: ${reason}`, () => {
      expect(() => scan(code)).toThrow(
        expect.objectContaining({ name: 'CssSyntaxError', reason, source: code }),
      );
    });
  }
});

describe('Sass statement tree construction', () => {
  it('checks indentation before scanning a malformed header', () => {
    const code = 'a\n    color: red\n  content: "unfinished\n';
    expect(() => new SassStatementParser(new postcss.Input(code)).parse()).toThrow(
      expect.objectContaining({ reason: 'Inconsistent indentation.', line: 3, column: 3 }),
    );
  });

  it('normalizes sibling and child comments without losing source spans', () => {
    const code = '@use "theme" // module\na // selector\n  color: red\n';
    const nodes = new SassStatementParser(new postcss.Input(code)).parse();
    const summarize = (node: SassStatement): object => ({
      type: node.type,
      header: code.slice(node.start, node.headerEnd),
      nodes: node.nodes?.map(summarize),
    });
    expect(nodes.map(summarize)).toEqual([
      { type: 'atrule', header: '@use "theme"', nodes: undefined },
      { type: 'comment', header: '// module', nodes: undefined },
      {
        type: 'rule',
        header: 'a',
        nodes: [
          { type: 'comment', header: '// selector', nodes: undefined },
          { type: 'decl', header: 'color: red', nodes: undefined },
        ],
      },
    ]);
    expect(nodes[2].end).toBe(code.trimEnd().length);
  });
});
