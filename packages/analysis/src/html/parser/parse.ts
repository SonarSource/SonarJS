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
import * as htmlparser from 'htmlparser2';
import { type EmbeddedJS } from '../../contracts/embedded.js';

/**
 * References:
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#textjavascript
 */

const validMimeTypes = new Set([
  'module',
  'text/javascript',
  'application/javascript',
  'application/ecmascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
]);

/**
 * Parses HTML file and extracts JS code
 * We look for script tags without src attribute, meaning the code is
 * inline between open and close tags.
 */
export function parseHTML(code: string): EmbeddedJS[] {
  if (!code) {
    return [];
  }
  const lineStarts = computeLineStarts(code);
  const embeddedJSs: EmbeddedJS[] = [];
  let jsSnippetStartIndex = 0;
  let jsSnippetEndIndex = 0;
  let inScript = false;
  let scriptKind: NonNullable<EmbeddedJS['extras']['scriptKind']>;

  const parser = new htmlparser.Parser({
    onopentag(name: string, attrs: { src: string; type?: string }) {
      // Test if current tag is a valid <script> tag.
      if (name !== 'script') {
        return;
      }

      //ignore script tags which point to another file
      // or tags containing a non-js type
      if (attrs.src || (attrs.type && !validMimeTypes.has(attrs.type))) {
        return;
      }

      inScript = true;
      scriptKind = classifyScript(attrs);

      jsSnippetStartIndex = parser.endIndex + 1;
    },

    onclosetag(name: string) {
      if (name !== 'script' || !inScript) {
        return;
      }

      inScript = false;

      jsSnippetEndIndex = parser.startIndex;

      embeddedJSs.push({
        code: code.slice(jsSnippetStartIndex, jsSnippetEndIndex),
        line: computeLine(jsSnippetStartIndex, lineStarts),
        column: computeCol(jsSnippetStartIndex, lineStarts),
        offset: jsSnippetStartIndex,
        lineStarts,
        format: 'PLAIN',
        text: code,
        extras: { scriptKind },
      });

      jsSnippetStartIndex = jsSnippetEndIndex;
    },
  });

  parser.parseComplete(code);
  return embeddedJSs;
}

/**
 * Classifies an inline `<script>` block with respect to the global scope it shares with the other
 * script blocks of the same document.
 *
 * A classic (non-module) script shares the page's global lexical scope with the other classic
 * scripts of the document, while a module script has its own isolated module scope. Only "type"
 * matters here: "defer" has no effect without a "src" attribute, and scripts with "src" are not
 * extracted at all, so an inline classic script always runs synchronously in document order, while
 * an inline module one never does whether or not it carries "async".
 */
function classifyScript(attrs: { type?: string }): NonNullable<EmbeddedJS['extras']['scriptKind']> {
  return attrs.type === 'module' ? 'module' : 'classic';
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

const lineEndingsRe = /\r\n|\r|\n/g;

/**
 * Computes the line start offsets for the provided string
 *
 * @param str
 * @returns
 */
function computeLineStarts(str: string) {
  const result = [0];
  lineEndingsRe.lastIndex = 0;
  while (true) {
    const match = lineEndingsRe.exec(str);
    if (!match) {
      break;
    }
    result.push(lineEndingsRe.lastIndex);
  }
  return result;
}
