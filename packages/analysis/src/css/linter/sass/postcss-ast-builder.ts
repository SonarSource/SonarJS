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
import postcss, {
  type ChildNode,
  type Container,
  type Input,
  type Position,
  type Root,
  type Source,
} from 'postcss';
import type { SassStatement } from './sass-statement.js';
import scss from 'postcss-scss';
import assert from 'node:assert';

type Bounds = { start: number; end: number };

/**
 * Maps Sass statements to PostCSS nodes while retaining original spelling and source locations.
 * Statement headers are read from the source and tokenized with postcss-scss; expressions
 * remain strings, so the parser does not need a Sass expression grammar.
 */
export class PostcssAstBuilder {
  constructor(private readonly input: Input) {}

  /** Build a PostCSS root whose nodes and locations refer to the original Sass source. */
  build(statements: SassStatement[]): Root {
    const root = postcss.root();
    root.source = this.source({ start: 0, end: this.input.css.length });
    this.buildChildren(root, statements, 0, this.input.css.length);
    return root;
  }

  private buildChildren(
    parent: Container,
    nodes: SassStatement[],
    start: number,
    end: number,
  ): void {
    const input = this.input;
    let cursor = start;
    for (const statement of nodes) {
      const converted = this.buildStatement(statement);
      for (const node of converted) {
        const bounds = this.bounds(node);
        node.remove();
        node.raws.before = input.css.slice(cursor, bounds.start);
        parent.append(node);
        cursor = bounds.end;
      }
    }
    parent.raws.after = input.css.slice(cursor, end);
  }

  private buildStatement(node: SassStatement): ChildNode[] {
    const input = this.input;
    if (node.type === 'comment') {
      return this.buildComments(node.inline === true, node);
    }
    const nested = node.nodes;
    const headerEnd = node.headerEnd;
    const header = input.css.slice(node.start, headerEnd).trimEnd();
    const { parsed, insertedPrefix } = this.buildHeader(node, header);
    // A trailing // comment in a declaration's span becomes a separate SCSS node.
    if (node.type !== 'rule' && !nested && parsed.nodes.length > 1) {
      return parsed.nodes.map(child => this.locateHeaderChild(child, node, insertedPrefix));
    }
    const converted = parsed.first;
    assert.ok(converted, 'A Sass statement header must produce a PostCSS node.');
    converted.source = this.source(node);
    converted.raws.sassSemicolon = !nested && header.endsWith(';');
    if (nested) {
      const container = converted as Container;
      container.removeAll();
      this.buildChildren(container, nested, node.start + header.length, node.end);
    }
    return [converted];
  }

  private buildHeader(
    statement: SassStatement,
    header: string,
  ): { parsed: Root; insertedPrefix: number } {
    // SCSS shares Sass declaration/at-rule tokens, including comments and !important.
    const normalized = this.normalizeHeader(statement, header);
    const insertedPrefix = normalized.length - header.length;
    // Without a value, SCSS interprets `font: {}` as a selector rather than a nested property.
    const emptyNestedValue =
      statement.type === 'decl' && statement.nodes !== undefined && normalized.endsWith(':');
    const suffix = statement.type === 'rule' || statement.nodes ? '{}' : '';
    const parsed = this.tokenizeHeader(
      normalized + (emptyNestedValue ? ' __sonar_sass_empty__' : '') + suffix,
      statement,
      insertedPrefix,
    );
    const converted = parsed.first;
    assert.ok(converted, 'A Sass statement header must produce a PostCSS node.');
    // SCSS stores source-preserving spelling separately from its CSS spelling.
    for (const field of ['selector', 'value', 'params']) {
      const raw = converted.raws[field] as { raw: string; scss?: string } | undefined;
      if (raw?.scss !== undefined) {
        raw.raw = raw.scss;
      }
    }
    if (emptyNestedValue) {
      assert.ok(converted.type === 'decl', 'A nested property must produce a declaration.');
      converted.value = '';
      converted.raws.between = converted.raws.between?.trimEnd();
    }
    if (insertedPrefix !== 0) {
      converted.raws.sassShorthand = header[0];
    }
    return { parsed, insertedPrefix };
  }

  private normalizeHeader(statement: SassStatement, header: string): string {
    if (statement.type === 'atrule') {
      if (header.startsWith('+')) {
        return `@include ${header.slice(1)}`;
      }
      if (header.startsWith('=')) {
        return `@mixin ${header.slice(1)}`;
      }
    }
    return header;
  }

  private locateHeaderChild(
    child: ChildNode,
    statement: SassStatement,
    insertedPrefix: number,
  ): ChildNode {
    const bounds = this.bounds(child);
    const adjustment = statement.start - insertedPrefix;
    child.raws.sassSemicolon = this.input.css
      .slice(adjustment + bounds.start, adjustment + bounds.end)
      .endsWith(';');
    child.source = this.source({
      start: Math.max(statement.start, adjustment + bounds.start),
      end: adjustment + bounds.end,
    });
    return child;
  }

  private tokenizeHeader(text: string, statement: SassStatement, insertedPrefix: number): Root {
    try {
      return scss.parse(text);
    } catch (error) {
      if (error.name !== 'CssSyntaxError' || typeof error.input?.offset !== 'number') {
        throw error;
      }
      // Tokenizer errors refer to a header fragment, possibly with a synthetic mixin prefix.
      const offset = Math.max(
        statement.start,
        Math.min(statement.headerEnd, statement.start + error.input.offset - insertedPrefix),
      );
      throw this.input.error(error.reason, offset);
    }
  }

  private buildComments(inline: boolean, range: Bounds): ChildNode[] {
    const input = this.input;
    const text = input.css.slice(range.start, range.end);
    if (!inline) {
      const body = text.slice(2).replace(/\*\/$/, '');
      const comment = this.createComment(body);
      comment.raws.sassUnclosed = !text.endsWith('*/');
      comment.source = this.source(range);
      return [comment];
    }
    // Separate consecutive // comments so NOSONAR and sonar-resolve retain their own line numbers.
    const ranges: Bounds[] = [];
    let offset = range.start;
    for (const line of text.split(/(?<=\n)/)) {
      const match = /^([\t ]*)\/\/(.*?)[\r\n]*$/.exec(line);
      const end = offset + line.trimEnd().length;
      if (match) {
        ranges.push({ start: offset + match[1].length, end });
      } else {
        // Indented Sass comments may continue on a line without another // marker.
        const previous = ranges.at(-1);
        if (previous) {
          previous.end = end;
        }
      }
      offset += line.length;
    }
    // Read each full comment once, retaining interior whitespace without repeated rescanning.
    return ranges.map(bounds => {
      const comment = this.createComment(input.css.slice(bounds.start + 2, bounds.end));
      comment.raws.inline = true;
      comment.source = this.source(bounds);
      return comment;
    });
  }

  private createComment(body: string): postcss.Comment {
    const text = body.trim();
    return postcss.comment({
      text,
      raws: {
        left: body.slice(0, body.length - body.trimStart().length),
        right: text ? body.slice(body.trimEnd().length) : '',
      },
    });
  }

  private source({ start, end }: Bounds): Source {
    const input = this.input;
    // PostCSS's end line/column are inclusive, while end.offset is exclusive.
    return {
      input,
      start: this.position(start),
      end: { ...this.position(Math.max(start, end - 1)), offset: end },
    };
  }

  private bounds(node: ChildNode): Bounds {
    const start = node.source?.start?.offset;
    const end = node.source?.end?.offset;
    assert.ok(start !== undefined && end !== undefined, 'A parsed PostCSS node must have offsets.');
    return { start, end };
  }

  private position(offset: number): Position {
    const input = this.input;
    const position = input.fromOffset(offset);
    assert.ok(position, 'A source offset must resolve to a position.');
    const { line, col } = position;
    return { line, column: col, offset };
  }
}
