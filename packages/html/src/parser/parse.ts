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
import { EmbeddedJS } from '@sonar/shared/embedded';

/**
 * References:
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#textjavascript
 */

const validMimeTypes = [
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
];

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

  const parser = new htmlparser.Parser({
    onopentag(name: string, attrs: { src: string; type?: string }) {
      // Test if current tag is a valid <script> tag.
      if (name !== 'script') {
        return;
      }

      //ignore script tags which point to another file
      // or tags containing a non-js type
      if (attrs.src || (attrs.type && !validMimeTypes.includes(attrs.type))) {
        return;
      }

      inScript = true;

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
        extras: {},
      });

      jsSnippetStartIndex = jsSnippetEndIndex;
    },
  });

  parser.parseComplete(code);
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
