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
import { EmbeddedJS } from 'parsing/embedded';
import { TransformableString } from './html/TransformableString';

// strongly inspired from https://github.com/BenoitZugmeyer/eslint-plugin-html/blob/12047e752d3f0904541e37ad7ffacde6149e2388/src/extract.js#L10

type CdataLocation = {
  start: number;
  end: number;
};

export function parseHTML(code: string) {
  if (!code) return;
  const embeddedJSs: EmbeddedJS[] = [];
  const javaScriptTagNames = ['script'];
  let index = 0;
  let inScript = false;
  let cdatas: CdataLocation[] = [];

  const parser = new htmlparser.Parser({
    onopentag(name: string, attrs: { src: string }) {
      // Test if current tag is a valid <script> tag.
      if (!javaScriptTagNames.includes(name)) {
        return;
      }

      if (attrs.src) {
        return;
      }

      inScript = true;

      index = parser.endIndex + 1;
    },

    oncdatastart() {
      cdatas.push(
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

      const transformedCode = new TransformableString(code);
      for (const cdata of cdatas) {
        transformedCode.replace(cdata.start, cdata.end, '');
      }
      transformedCode.replace(0, index, '');
      transformedCode.replace(parser.startIndex, code.length, '');

      embeddedJSs.push({
        code: transformedCode.toString(),
        line: computeLine(index, transformedCode._lineStarts),
        column: computeCol(index, transformedCode._lineStarts),
        offset: index,
        lineStarts: transformedCode._lineStarts,
        format: 'PLAIN',
        text: code,
        extras: {},
      });

      index = parser.startIndex;
      cdatas = [];
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
