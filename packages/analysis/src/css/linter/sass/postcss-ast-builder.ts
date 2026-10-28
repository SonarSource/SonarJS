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
import type { AnyStatement, Root as SassRoot } from 'sass-parser';
import scss from 'postcss-scss';
import { SassSource } from './sass-source.js';
import { trailingComment } from './sass-header.js';

type Bounds = { start: number; end: number };

/**
 * Maps Sass statements to PostCSS nodes while retaining original spelling and source locations.
 * sass-parser's getters normalize values and some APIs (notably `important`) are unfinished,
 * so statement headers are read from the source and tokenized with postcss-scss.
 */
export class PostcssAstBuilder {
  private readonly input: Input;

  constructor(private readonly sassSource: SassSource) {
    this.input = sassSource.input;
  }

  /** Build a PostCSS root whose nodes and locations refer to the original Sass source. */
  build(sassRoot: SassRoot): Root {
    const root = postcss.root();
    root.source = this.source({ start: 0, end: this.input.css.length });
    this.buildChildren(root, sassRoot.nodes, 0, this.input.css.length);
    return root;
  }

  private buildChildren(
    parent: Container,
    nodes: AnyStatement[],
    start: number,
    end: number,
  ): void {
    const input = this.input;
    const ranges = this.childBounds(nodes);
    let cursor = start;
    const append = (node: ChildNode): void => {
      node.remove();
      node.raws.before = input.css.slice(cursor, node.source!.start!.offset);
      parent.append(node);
      cursor = node.source!.end!.offset!;
    };
    const retainSkippedStatements = (until: number): void => {
      const text = input.css.slice(cursor, until);
      if (!/\S/.test(text)) {
        return;
      }
      // Sass omits @charset from its AST. Keep such source-only statements for metrics/highlighting.
      const offset = cursor;
      for (const node of [...scss.parse(text).nodes]) {
        node.source = this.source({
          start: offset + node.source!.start!.offset!,
          end: offset + node.source!.end!.offset!,
        });
        append(node);
      }
    };
    for (let i = 0; i < nodes.length; i++) {
      const range = ranges[i];
      retainSkippedStatements(range.start);
      const converted = this.buildStatement(nodes[i], range);
      for (const node of converted) {
        append(node);
      }
    }
    retainSkippedStatements(end);
    parent.raws.after = input.css.slice(cursor, end);
  }

  private buildStatement(node: AnyStatement, range: Bounds): ChildNode[] {
    const input = this.input;
    if (node.type === 'comment') {
      return this.buildComments(node.sassType === 'sass-comment', range);
    }
    let nested = 'nodes' in node ? node.nodes : undefined;
    const inlineSelector = nested?.[0];
    if (
      node.type === 'atrule' &&
      node.name === 'at-root' &&
      inlineSelector?.type === 'rule' &&
      this.position(this.bounds(inlineSelector).start).line === this.position(range.start).line
    ) {
      // Dart Sass turns `@at-root &` into an implicit rule. Keep its selector in the
      // source header instead, so CSS rules do not report a redundant nested `&`.
      nested = inlineSelector.nodes;
    }
    const firstChild = nested?.[0];
    const headerEnd = firstChild ? this.bounds(firstChild).start : range.end;
    const originalHeader = input.css.slice(range.start, headerEnd).trimEnd();
    const comment = trailingComment(originalHeader);
    const header = (
      comment === undefined ? originalHeader : originalHeader.slice(0, comment)
    ).trimEnd();
    let converted: ChildNode;
    if (node.type === 'rule') {
      converted = this.tokenizeHeader(`${header}{}`, range, 0).first!;
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
        range,
        normalized.length - header.length,
      );
      converted = parsed.first!;
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
        const offsetAdjustment = range.start - (shorthand ? normalized.length - header.length : 0);
        return parsed.nodes.map(child => {
          child.raws.sassSemicolon = input.css
            .slice(
              offsetAdjustment + child.source!.start!.offset!,
              offsetAdjustment + child.source!.end!.offset!,
            )
            .endsWith(';');
          child.source = this.source({
            start: offsetAdjustment + child.source!.start!.offset!,
            end: offsetAdjustment + child.source!.end!.offset!,
          });
          return child;
        });
      }
    }
    for (const field of ['selector', 'value', 'params']) {
      const raw = converted.raws[field] as { raw: string; scss?: string } | undefined;
      if (raw?.scss !== undefined) raw.raw = raw.scss;
    }
    converted.source = this.source(
      comment !== undefined && !nested
        ? { start: range.start, end: range.start + header.length }
        : range,
    );
    converted.raws.sassSemicolon = !nested && header.endsWith(';');
    if (nested) {
      const container = converted as Container;
      container.removeAll();
      this.buildChildren(container, nested, range.start + header.length, range.end);
    }
    return comment !== undefined && !nested
      ? [converted, ...this.buildComments(true, { start: range.start + comment, end: range.end })]
      : [converted];
  }

  private tokenizeHeader(text: string, range: Bounds, insertedPrefix: number): Root {
    try {
      return scss.parse(text);
    } catch (error) {
      if (error.name !== 'CssSyntaxError' || typeof error.input?.offset !== 'number') throw error;
      const offset = Math.max(
        range.start,
        Math.min(range.end, range.start + error.input.offset - insertedPrefix),
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
      } else if (ranges.length > 0) {
        // Indented Sass comments may continue on a line without another // marker.
        ranges.at(-1)!.end = end;
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

  /** Sass gives all branches of an if/else chain the span of the entire chain. */
  private childBounds(nodes: AnyStatement[]): Bounds[] {
    const input = this.input;
    const ranges = nodes.map(node => {
      const range = this.bounds(node);
      return {
        start: range.start,
        end: range.start + input.css.slice(range.start, range.end).trimEnd().length,
      };
    });
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].sassType !== 'if-rule') {
        continue;
      }
      const range = ranges[i];
      let last = i;
      while (nodes[last + 1]?.sassType === 'else-rule' && ranges[last + 1].start === range.start) {
        last++;
      }
      if (last === i) {
        continue;
      }
      const column = this.position(range.start).column;
      const text = input.css.slice(range.start, range.end);
      const branchStarts = [range.start];
      for (const match of text.matchAll(/^[\t ]*@else\b/gm)) {
        const offset = range.start + match.index + match[0].indexOf('@');
        if (this.position(offset).column === column) {
          branchStarts.push(offset);
        }
      }
      for (let branch = i; branch <= last; branch++) {
        const next = branchStarts[branch - i + 1] ?? range.end;
        ranges[branch] = {
          start: branchStarts[branch - i],
          end: range.start + input.css.slice(range.start, next).trimEnd().length,
        };
      }
      i = last;
    }
    return ranges;
  }

  private bounds(node: AnyStatement): Bounds {
    let start = this.sassSource.originalOffset(node.source!.start!.offset!);
    const code = this.input.css;
    // A leading backslash disambiguates selectors such as \::selection in indented Sass.
    // Sass's statement span starts after that marker; keep it out of the parent's header.
    if (
      node.type === 'rule' &&
      code[start - 1] === '\\' &&
      /^[\t ]*$/.test(code.slice(code.lastIndexOf('\n', start - 1) + 1, start - 1))
    ) {
      start--;
    }
    return { start, end: this.sassSource.originalOffset(node.source!.end!.offset!) };
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
