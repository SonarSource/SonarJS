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
import type { Comment as PostCssComment, Document, Root } from 'postcss';
import type { SonarResolveComment } from '../contracts/analysis.js';

const SONAR_RESOLVE_KEYWORD = 'sonar-resolve';

type CommentSource = {
  column: number;
  endLine: number;
  kind: 'block' | 'line';
  line: number;
  text: string;
};

type JsTsComment = {
  loc?: {
    start: { line: number; column: number };
    end: { line: number };
  } | null;
  type: string;
  value: string;
};

export function extractSonarResolveCommentsFromJsTsComments(
  comments: readonly JsTsComment[] = [],
): SonarResolveComment[] {
  return extractSonarResolveComments(
    comments.flatMap(comment => {
      if (comment.loc == null) {
        return [];
      }

      return [
        {
          column: comment.loc.start.column,
          endLine: comment.loc.end.line,
          kind: comment.type === 'Line' ? 'line' : 'block',
          line: comment.loc.start.line,
          text: comment.value,
        } satisfies CommentSource,
      ];
    }),
  );
}

export function extractSonarResolveCommentsFromCssRoot(
  root: Root | Document,
): SonarResolveComment[] {
  const comments: CommentSource[] = [];

  root.walkComments(comment => {
    const line = comment.source?.start?.line;
    const column = comment.source?.start?.column;
    if (line == null || column == null) {
      return;
    }

    comments.push({
      column,
      endLine: comment.source?.end?.line ?? line,
      kind: isCssLineComment(comment) ? 'line' : 'block',
      line,
      text: comment.text,
    });
  });

  return extractSonarResolveComments(comments);
}

function extractSonarResolveComments(comments: CommentSource[]): SonarResolveComment[] {
  const extracted: SonarResolveComment[] = [];
  const orderedComments = [...comments].sort(
    (left, right) => left.line - right.line || left.column - right.column,
  );
  let lineCommentRun: CommentSource[] = [];

  for (const comment of orderedComments) {
    if (comment.kind === 'line') {
      if (
        lineCommentRun.length > 0 &&
        lineCommentRun[lineCommentRun.length - 1].endLine + 1 !== comment.line
      ) {
        pushLineCommentRun(lineCommentRun, extracted);
        lineCommentRun = [];
      }

      lineCommentRun.push(comment);
      continue;
    }

    if (lineCommentRun.length > 0) {
      pushLineCommentRun(lineCommentRun, extracted);
      lineCommentRun = [];
    }

    if (containsDirective(comment.text)) {
      extracted.push({
        line: comment.line,
        text: comment.text,
      });
    }
  }

  if (lineCommentRun.length > 0) {
    pushLineCommentRun(lineCommentRun, extracted);
  }

  return extracted;
}

function pushLineCommentRun(lineCommentRun: CommentSource[], extracted: SonarResolveComment[]) {
  const text = lineCommentRun.map(comment => comment.text).join('\n');
  if (!containsDirective(text)) {
    return;
  }

  extracted.push({
    line: lineCommentRun[0].line,
    text,
  });
}

function containsDirective(text: string) {
  return splitLines(text).some(startsWithDirectiveKeyword);
}

function splitLines(text: string) {
  return text.split(/\r\n|\r|\n/u);
}

function startsWithDirectiveKeyword(line: string) {
  return (
    line.trimStart().slice(0, SONAR_RESOLVE_KEYWORD.length).toLowerCase() === SONAR_RESOLVE_KEYWORD
  );
}

function isCssLineComment(comment: PostCssComment) {
  const raws = comment.raws as { begin?: string; inline?: boolean };
  return raws.inline === true || raws.begin === '//';
}
