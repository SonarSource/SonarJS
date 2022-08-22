/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import path from 'path';
import { SourceCode } from 'eslint';
import { readFile, setContext } from 'helpers';
import { buildSourceCode } from 'parsing/jsts';
import { buildSourceCodes, EmbeddedJS, patchParsingErrorMessage } from 'parsing/yaml';
import { JsTsAnalysisInput } from 'services/analysis';

describe('patchSourceCode', () => {
  beforeAll(() => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should patch source code', () => {
    const filePath = path.join(__dirname, 'fixtures', 'patch', 'source-code.yaml');
    const [patchedSourceCode] = buildSourceCodes(filePath) as SourceCode[];
    expect(patchedSourceCode).toEqual(
      expect.objectContaining({
        text: readFile(filePath),
        lineStartIndices: [0, 37, 48, 70, 108, 124, 152, 172, 199, 222, 232],
        lines: [
          'AWSTemplateFormatVersion: 2010-09-09',
          'Resources:',
          '  SomeLambdaFunction:',
          '    Type: "AWS::Serverless::Function"',
          '    Properties:',
          '      Runtime: "nodejs16.0"',
          '      InlineCode: >',
          '        function f(g, x) {',
          '          return g(x);',
          '        }',
          '',
        ],
      }),
    );
  });

  test.each(['body', 'tokens', 'comments'])('should patch ast %s', property => {
    const fixture = path.join(__dirname, 'fixtures', 'patch', property);

    const filePath = `${fixture}.yaml`;
    const [patchedSourceCode] = buildSourceCodes(filePath) as SourceCode[];
    const patchedNodes = patchedSourceCode.ast[property];

    const input = { filePath: `${fixture}.js` } as JsTsAnalysisInput;
    const referenceSourceCode = buildSourceCode(input, 'js') as SourceCode;
    const referenceNodes = referenceSourceCode.ast[property];

    expect(patchedNodes).toEqual(referenceNodes);
  });

  it('should patch parsing errors', () => {
    const fixture = path.join(__dirname, 'fixtures', 'patch', 'parsing-error');

    const filePath = `${fixture}.yaml`;
    let patchedParsingError;
    try {
      buildSourceCodes(filePath);
    } catch (error) {
      patchedParsingError = error;
    }

    const input = { filePath: `${fixture}.js` } as JsTsAnalysisInput;

    let referenceParsingError;
    try {
      buildSourceCode(input, 'js');
    } catch (error) {
      referenceParsingError = error;
    }
    expect(patchedParsingError).toEqual(referenceParsingError);
  });

  it('should patch parsing error messages', () => {
    const message = `Unexpected parsing error`;
    const patchedLine = 3;
    const embeddedJS = { code: 'f(x', line: 4, column: 10, format: 'PLAIN' } as EmbeddedJS;
    const patchedMessage = patchParsingErrorMessage(message, patchedLine, embeddedJS);
    expect(patchedMessage).toEqual(`Unexpected parsing error`);
  });
});
