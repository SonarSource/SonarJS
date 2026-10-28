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
  type Container,
  type AnyNode,
  type ProcessOptions,
  type Root,
  type Stringifier,
  type Syntax,
} from 'postcss';
import { SassStatementParser } from './sass-statement-parser.js';
import { PostcssAstBuilder } from './postcss-ast-builder.js';

/** Parse Sass statement structure and build the PostCSS representation for Stylelint. */
function parse(code: string | { toString(): string }, options?: ProcessOptions): Root {
  const input = new postcss.Input(code.toString(), options);
  const statements = new SassStatementParser(input).parse();
  return new PostcssAstBuilder(input).build(statements);
}

/** Emit indentation and original token spelling, without introducing CSS braces or semicolons. */
const stringify: Stringifier = (node, builder) => {
  function write(current: AnyNode): void {
    if (current.type === 'root' || current.type === 'document') {
      body(current as Container);
      return;
    }
    if (current.type === 'comment') {
      const comment = current as postcss.Comment;
      builder(
        `${comment.raws.inline ? '//' : '/*'}${comment.raws.left ?? ''}${comment.text}${comment.raws.right ?? ''}${comment.raws.inline || comment.raws.sassUnclosed ? '' : '*/'}`,
        current,
      );
      return;
    }
    if (current.type === 'rule') {
      builder((current as postcss.Rule).selector, current, 'start');
    } else if (current.type === 'atrule') {
      const rule = current as postcss.AtRule;
      const params = rule.raws.params?.raw ?? rule.params;
      builder(
        rule.raws.sassShorthand
          ? rule.raws.sassShorthand + params
          : `@${rule.name}${rule.raws.afterName ?? ''}${params}`,
        current,
        'start',
      );
    } else {
      postcss.stringify(current, builder);
    }
    if ('nodes' in current && current.nodes) {
      body(current as Container);
    }
    if (current.raws.sassSemicolon) {
      builder(';', current, 'end');
    }
  }
  function body(container: Container): void {
    for (const child of container.nodes ?? []) {
      builder(child.raws.before ?? '');
      write(child);
    }
    builder(container.raws.after ?? '');
  }
  write(node);
};

export const postcssSass: Syntax = { parse, stringify };
