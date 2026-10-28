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
import type { Input } from 'postcss';
import type { SassLine, SassStatement } from './sass-statement.js';
import { SassStatementScanner } from './sass-statement-scanner.js';
import { canHaveChildren } from './sass-statement-rules.js';

type IndentationLevel = { indent: number; nodes: SassStatement[] };

/** Organizes scanned statements by indentation, then normalizes comments and container spans. */
export class SassStatementParser {
  constructor(
    private readonly input: Input,
    private readonly embedded = false,
  ) {}

  parse(): SassStatement[] {
    const nodes: SassStatement[] = [];
    const scanner = new SassStatementScanner(this.input);
    const levels: IndentationLevel[] = [
      { indent: this.embedded ? (scanner.peekLine()?.indent.length ?? 0) : 0, nodes },
    ];
    let previous: SassStatement | undefined;
    let indentCharacter: string | undefined;
    let line: SassLine | undefined;
    while ((line = scanner.peekLine())) {
      indentCharacter = this.validateIndentation(line, indentCharacter);
      const siblings = this.containerAtIndent(line, levels, previous);
      previous = scanner.readStatement(line);
      siblings.push(previous);
    }
    return this.normalizeStatements(nodes);
  }

  private validateIndentation(line: SassLine, indentCharacter?: string): string | undefined {
    if (!line.indent) return indentCharacter;
    indentCharacter ??= line.indent[0];
    if ([...line.indent].some(character => character !== indentCharacter)) {
      throw this.input.error('Mixed tabs and spaces in indentation.', line.start);
    }
    return indentCharacter;
  }

  private containerAtIndent(
    line: SassLine,
    levels: IndentationLevel[],
    previous?: SassStatement,
  ): SassStatement[] {
    const indent = line.indent.length;
    const start = line.start + indent;
    if (indent > levels.at(-1)!.indent) {
      if (!previous || !canHaveChildren(previous, this.input.css)) {
        throw this.input.error('Unexpected indentation.', start);
      }
      previous.nodes ??= [];
      levels.push({ indent, nodes: previous.nodes });
    } else {
      while (levels.length > 1 && indent < levels.at(-1)!.indent) levels.pop();
      if (indent !== levels.at(-1)!.indent) {
        throw this.input.error('Inconsistent indentation.', start);
      }
    }
    return levels.at(-1)!.nodes;
  }

  private normalizeStatements(nodes: SassStatement[]): SassStatement[] {
    const normalized: SassStatement[] = [];
    for (const statement of nodes) {
      // Comments alone do not turn an ambiguous declaration into a selector block.
      if (
        statement.declarationCandidate !== undefined &&
        !statement.nodes?.some(child => child.type !== 'comment')
      ) {
        statement.type = 'decl';
      }
      const siblingComment = this.separateTrailingComment(statement);
      if (statement.nodes) {
        statement.nodes = this.normalizeStatements(statement.nodes);
        statement.end = statement.nodes.at(-1)?.end ?? statement.end;
      }
      this.validateChildren(statement);
      normalized.push(statement);
      if (siblingComment) normalized.push(siblingComment);
    }
    return normalized;
  }

  private separateTrailingComment(statement: SassStatement): SassStatement | undefined {
    if (statement.trailingComment === undefined) return undefined;
    const start = statement.trailingComment;
    const end = statement.headerEnd;
    const comment: SassStatement = { type: 'comment', inline: true, start, end, headerEnd: end };
    const codeEnd = statement.start + this.input.css.slice(statement.start, start).trimEnd().length;
    // SCSS otherwise absorbs a trailing // comment into at-rule parameters.
    if (statement.type === 'atrule' && !statement.nodes) {
      statement.end = statement.headerEnd = codeEnd;
      return comment;
    }
    if (statement.nodes || statement.type === 'rule') {
      statement.headerEnd = codeEnd;
      statement.nodes ??= [];
      statement.nodes.unshift(comment);
    }
    return undefined;
  }

  private validateChildren(statement: SassStatement): void {
    if (statement.type !== 'decl') return;
    const selector = statement.nodes?.find(child => child.type === 'rule');
    if (selector) throw this.input.error('Expected a nested property.', selector.start);
  }
}
