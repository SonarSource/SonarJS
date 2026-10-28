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
    const append = (node: ChildNode): void => {
      node.remove();
      node.raws.before = input.css.slice(cursor, node.source!.start!.offset);
      parent.append(node);
      cursor = node.source!.end!.offset!;
    };
    for (const statement of nodes) {
      const converted = this.buildStatement(statement);
      for (const node of converted) {
        append(node);
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
    let converted: ChildNode;
    if (node.type === 'rule') {
      converted = this.tokenizeHeader(`${header}{}`, node, 0).first!;
      const raw = converted.raws.selector as { raw: string; scss?: string } | undefined;
      if (raw?.scss !== undefined) raw.raw = raw.scss;
    } else {
      // SCSS shares Sass declaration/at-rule token syntax. Let its tokenizer retain raw values,
      // comments and !important rather than duplicating those lexical rules here.
      const shorthand = node.type === 'atrule' && (header[0] === '+' || header[0] === '=');
      const normalized = shorthand
        ? `@${header[0] === '+' ? 'include' : 'mixin'} ${header.slice(1)}`
        : header;
      // Without a value, SCSS interprets `font: {}` as a selector rather than a nested property.
      const emptyNestedValue = node.type === 'decl' && nested && normalized.endsWith(':');
      const parsed = this.tokenizeHeader(
        normalized + (emptyNestedValue ? ' __sonar_sass_empty__' : '') + (nested ? '{}' : ''),
        node,
        normalized.length - header.length,
      );
      converted = parsed.first!;
      // SCSS stores source-preserving inline comments separately from its CSS spelling.
      for (const field of ['value', 'params']) {
        const raw = converted.raws[field] as { raw: string; scss?: string } | undefined;
        if (raw?.scss !== undefined) raw.raw = raw.scss;
      }
      if (emptyNestedValue) {
        const declaration = converted as postcss.Declaration;
        declaration.value = '';
        declaration.raws.between = declaration.raws.between!.trimEnd();
      }
      if (shorthand) {
        converted.raws.sassShorthand = header[0];
      }
      // Sass includes a trailing // comment in the declaration's span, rather than making it
      // a separate statement. SCSS gives it its own node; retain it and its original location.
      if (!nested && parsed.nodes.length > 1) {
        const offsetAdjustment = node.start - (shorthand ? normalized.length - header.length : 0);
        return parsed.nodes.map(child => {
          child.raws.sassSemicolon = input.css
            .slice(
              offsetAdjustment + child.source!.start!.offset!,
              offsetAdjustment + child.source!.end!.offset!,
            )
            .endsWith(';');
          child.source = this.source({
            start: Math.max(node.start, offsetAdjustment + child.source!.start!.offset!),
            end: offsetAdjustment + child.source!.end!.offset!,
          });
          return child;
        });
      }
    }
    converted.source = this.source(node);
    converted.raws.sassSemicolon = !nested && header.endsWith(';');
    if (nested) {
      const container = converted as Container;
      container.removeAll();
      this.buildChildren(container, nested, node.start + header.length, node.end);
    }
    return [converted];
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
    const result: ChildNode[] = [];
    let offset = range.start;
    for (const line of text.split(/(?<=\n)/)) {
      const match = /^([\t ]*)\/\/(.*?)[\r\n]*$/.exec(line);
      if (match) {
        const comment = this.createComment(match[2]);
        comment.raws.inline = true;
        const start = offset + match[1].length;
        comment.source = this.source({ start, end: offset + line.trimEnd().length });
        result.push(comment);
      } else if (result.length > 0) {
        // Indented Sass comments may continue on a line without another // marker.
        const previous = result.at(-1)! as postcss.Comment;
        const end = offset + line.trimEnd().length;
        // Rebuild from the source span so interior newlines and whitespace stay verbatim.
        const merged = this.createComment(
          input.css.slice(previous.source!.start!.offset! + 2, end),
        );
        previous.text = merged.text;
        previous.raws.left = merged.raws.left;
        previous.raws.right = merged.raws.right;
        previous.source = this.source({
          start: previous.source!.start!.offset!,
          end,
        });
      }
      offset += line.length;
    }
    return result;
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

  private position(offset: number): Position {
    const input = this.input;
    const { line, col } = input.fromOffset(offset)!;
    return { line, column: col, offset };
  }
}
