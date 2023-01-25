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
import * as htmlparser from 'htmlparser2';
import { EmbeddedJS } from 'parsing/yaml';
import { TransformableString } from './TransformableString';

const NO_IGNORE = 0;
const IGNORE_NEXT = 1;
const IGNORE_UNTIL_ENABLE = 2;

type CodeType = 'html' | 'script';

type Chunk = {
  type: CodeType;
  start: number;
  end: number;
  cdata: any[];
};

type CdataLocation = {
  start: number;
  end: number;
};

function iterateScripts(code: string, onChunk: any) {
  if (!code) return;
  const javaScriptTagNames = ['script'];
  let index = 0;
  let inScript = false;
  let cdata: CdataLocation[] = [];
  let ignoreState = NO_IGNORE;

  const chunks: Chunk[] = [];
  function pushChunk(type: CodeType, end: number) {
    chunks.push({ type, start: index, end, cdata });
    cdata = [];
    index = end;
  }

  const parser = new htmlparser.Parser({
    onopentag(name: string, attrs: any) {
      // Test if current tag is a valid <script> tag.
      if (!javaScriptTagNames.includes(name)) {
        return;
      }

      if (attrs.src) {
        return;
      }

      if (ignoreState === IGNORE_NEXT) {
        ignoreState = NO_IGNORE;
        return;
      }

      if (ignoreState === IGNORE_UNTIL_ENABLE) {
        return;
      }

      inScript = true;
      pushChunk('html', parser.endIndex + 1);
    },

    oncdatastart() {
      cdata.push(
        {
          start: parser.startIndex,
          end: parser.startIndex + 9,
        },
        {
          start: parser.endIndex - 2,
          end: parser.endIndex + 1,
        },
      );
    },

    onclosetag(name: string) {
      if (!javaScriptTagNames.includes(name) || !inScript) {
        return;
      }

      inScript = false;

      if (parser.startIndex < chunks[chunks.length - 1].end) {
        // The parser didn't move its index after the previous chunk emited. It occurs on
        // self-closing tags (xml mode). Just ignore this script.
        return;
      }

      pushChunk('script', parser.startIndex);
    },

    ontext() {
      if (!inScript) {
        return;
      }

      pushChunk('script', parser.endIndex + 1);
    },

    oncomment(comment: string) {
      comment = comment.trim();
      if (comment === 'eslint-disable') {
        ignoreState = IGNORE_UNTIL_ENABLE;
      } else if (comment === 'eslint-enable') {
        ignoreState = NO_IGNORE;
      } else if (comment === 'eslint-disable-next-script') {
        ignoreState = IGNORE_NEXT;
      }
    },
  });

  parser.parseComplete(code);

  pushChunk('html', parser.endIndex + 1);

  {
    const emitChunk = (index: number) => {
      const cdata: CdataLocation[] = [];
      for (let i = startChunkIndex; i < index; i += 1) {
        cdata.push.apply(cdata, chunks[i].cdata);
      }
      onChunk({
        type: chunks[startChunkIndex].type,
        start: chunks[startChunkIndex].start,
        end: chunks[index - 1].end,
        cdata,
      });
    };
    let startChunkIndex = 0;
    let index = 1;
    for (; index < chunks.length; index += 1) {
      if (chunks[startChunkIndex].type === chunks[index].type) continue;
      emitChunk(index);
      startChunkIndex = index;
    }

    emitChunk(index);
  }
}

function computeIndent(descriptor: any, previousHTML: string, slice: string) {
  if (!descriptor) {
    const indentMatch = /[\n\r]+([ \t]*)/.exec(slice);
    return indentMatch ? indentMatch[1] : '';
  }

  if (descriptor.relative) {
    return previousHTML.match(/([^\n\r]*)<[^<]*$/)?.[1] + descriptor.spaces;
  }

  return descriptor.spaces;
}

function* dedent(indent: string, slice: string) {
  let hadNonEmptyLine = false;
  const re = /(\r\n|\n|\r)([ \t]*)(.*)/g;
  let lastIndex = 0;

  while (true) {
    const match = re.exec(slice);
    if (!match) break;

    const newLine = match[1];
    const lineIndent = match[2];
    const lineText = match[3];

    const isEmptyLine = !lineText;
    const isFirstNonEmptyLine = !isEmptyLine && !hadNonEmptyLine;

    const badIndentation =
      // Be stricter on the first line
      isFirstNonEmptyLine ? indent !== lineIndent : lineIndent.indexOf(indent) !== 0;

    if (!badIndentation) {
      lastIndex = match.index + newLine.length + indent.length;
      // Remove the first line if it is empty
      const fromIndex = match.index === 0 ? 0 : match.index + newLine.length;
      yield {
        type: 'dedent',
        from: fromIndex,
        to: lastIndex,
      };
    } else if (isEmptyLine) {
      yield {
        type: 'empty',
      };
    } else {
      yield {
        type: 'bad-indent',
      };
    }

    if (!isEmptyLine) {
      hadNonEmptyLine = true;
    }
  }

  const endSpaces = slice.slice(lastIndex).match(/[ \t]*$/)?.[0].length;
  if (endSpaces) {
    yield {
      type: 'dedent',
      from: slice.length - endSpaces,
      to: slice.length,
    };
  }
}

export function parseHTML(code: string, indentDescriptor: any = {}) {
  const badIndentationLines: number[] = [];
  let lineNumber = 1;
  let previousHTML = '';

  const embeddedJSs: EmbeddedJS[] = [];

  iterateScripts(code, (chunk: any) => {
    const slice = code.slice(chunk.start, chunk.end);

    if (chunk.type === 'html') {
      const match = slice.match(/\r\n|\n|\r/g);
      if (match) lineNumber += match.length;
      previousHTML = slice;
    } else if (chunk.type === 'script') {
      const transformedCode = new TransformableString(code);
      let indentSlice = slice;
      for (const cdata of chunk.cdata) {
        transformedCode.replace(cdata.start, cdata.end, '');
        if (cdata.end === chunk.end) {
          indentSlice = code.slice(chunk.start, cdata.start);
        }
      }
      transformedCode.replace(0, chunk.start, '');
      transformedCode.replace(chunk.end, code.length, '');
      for (const action of dedent(
        computeIndent(indentDescriptor, previousHTML, indentSlice),
        indentSlice,
      )) {
        lineNumber += 1;
        if (action.type === 'dedent') {
          transformedCode.replace(chunk.start + action.from, chunk.start + action.to, '');
        } else if (action.type === 'bad-indent') {
          badIndentationLines.push(lineNumber);
        }
      }

      embeddedJSs.push({
        code: transformedCode.toString(),
        line: computeLine(chunk.start, transformedCode._lineStarts),
        column: computeCol(chunk.start, transformedCode._lineStarts),
        offset: chunk.start,
        lineStarts: transformedCode._lineStarts,
        format: 'PLAIN',
        text: code,
        extras: {},
      });
    }
  });

  return embeddedJSs;
}

function computeLine(offset: number, fileLineStarts: number[]) {
  let i = 0;
  for (; i < fileLineStarts.length; i++) {
    if (fileLineStarts[i] > offset) {
      break;
    }
  }
  return i;
}

function computeCol(offset: number, fileLineStarts: number[]) {
  let i = 0;
  for (; i < fileLineStarts.length; i++) {
    if (fileLineStarts[i] > offset) {
      break;
    }
  }
  return offset - fileLineStarts[i - 1] + 1;
}
