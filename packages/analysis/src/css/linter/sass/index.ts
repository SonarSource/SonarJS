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
import { sass } from 'sass-parser';
import { PostcssAstBuilder } from './postcss-ast-builder.js';
import { SassSource } from './sass-source.js';

/**
 * Parse Sass grammar and indentation, then build the PostCSS representation for Stylelint.
 *
 * patches/sass+1.106.1.patch disables eager CSS selector parsing in the parser export. Otherwise
 * Sass rejects valid percentage keyframe selectors. We only need statement spans, not selector ASTs.
 */
function parse(code: string | { toString(): string }, options?: ProcessOptions): Root {
  const input = new postcss.Input(code.toString(), options);
  const source = new SassSource(input, typeof options?.document === 'string');
  let parsed: ReturnType<typeof sass.parse>;
  try {
    parsed = sass.parse(source.code, { from: options?.from });
  } catch (error) {
    // The parser export currently throws a Dart error without the public SassException fields.
    // Its diagnostic footer carries the original, one-based location even when the path has spaces.
    const location = / (\d+):(\d+)\s+root stylesheet\s*$/.exec(error.message);
    if (!location) {
      throw error;
    }
    throw input.error(
      error.message.split('\n')[0].replace(/^Error:\s*/, ''),
      Number(location[1]),
      source.originalColumn(Number(location[1]), Number(location[2])),
    );
  }
  return new PostcssAstBuilder(source).build(parsed);
}

function atRuleHeader(rule: postcss.AtRule): string {
  const params = rule.raws.params?.raw ?? rule.params;
  const shorthand = rule.raws.sassShorthand;
  return typeof shorthand === 'string'
    ? shorthand + params
    : `@${rule.name}${rule.raws.afterName ?? ''}${params}`;
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
      const rule = current as postcss.Rule;
      const raw = rule.raws.selector;
      builder(raw?.value === rule.selector ? raw.raw : rule.selector, current, 'start');
    } else if (current.type === 'atrule') {
      builder(atRuleHeader(current as postcss.AtRule), current, 'start');
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
