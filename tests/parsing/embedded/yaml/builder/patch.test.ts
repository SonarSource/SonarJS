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
import path from 'path';
import { readFile, setContext } from 'helpers';
import { buildSourceCode, JsTsAnalysisInput } from '@sonar/jsts';
import { buildSourceCodes, EmbeddedJS, patchParsingErrorMessage } from 'parsing/embedded';
import { EmbeddedAnalysisInput } from 'services/analysis';

describe('patchSourceCode', () => {
  beforeAll(() => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should patch source code', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'patch', 'source-code.yaml');
    const text = await readFile(filePath);
    const [patchedSourceCode] = buildSourceCodes(
      {
        filePath,
        fileContent: text,
      } as EmbeddedAnalysisInput,
      'yaml',
    );
    expect(patchedSourceCode).toEqual(
      expect.objectContaining({
        text,
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

  test.each(['body', 'tokens', 'comments'])('should patch ast %s', async property => {
    const fixture = path.join(__dirname, 'fixtures', 'patch', property);

    let filePath = `${fixture}.yaml`;
    let fileContent = await readFile(filePath);
    const [patchedSourceCode] = buildSourceCodes(
      { filePath, fileContent } as EmbeddedAnalysisInput,
      'yaml',
    );
    const patchedNodes = patchedSourceCode.ast[property];

    filePath = `${fixture}.js`;
    fileContent = await readFile(filePath);
    const input = { filePath, fileContent } as JsTsAnalysisInput;
    const referenceSourceCode = buildSourceCode(input, 'js');
    const referenceNodes = referenceSourceCode.ast[property];

    expect(patchedNodes).toEqual(referenceNodes);
  });

  it('should patch parsing errors', async () => {
    const fixture = path.join(__dirname, 'fixtures', 'patch', 'parsing-error');

    let filePath = `${fixture}.yaml`;
    let fileContent = await readFile(filePath);
    let patchedParsingError;
    try {
      buildSourceCodes({ filePath, fileContent } as EmbeddedAnalysisInput, 'yaml');
    } catch (error) {
      patchedParsingError = error;
    }

    filePath = `${fixture}.js`;
    fileContent = await readFile(filePath);
    const input = { filePath, fileContent } as JsTsAnalysisInput;
    expect(() => buildSourceCode(input, 'js')).toThrow(patchedParsingError);
  });

  it('should patch parsing error messages', () => {
    const message = `Unexpected parsing error`;
    const patchedLine = 3;
    const embeddedJS = { code: 'f(x', line: 4, column: 10, format: 'PLAIN' } as EmbeddedJS;
    const patchedMessage = patchParsingErrorMessage(message, patchedLine, embeddedJS);
    expect(patchedMessage).toEqual(`Unexpected parsing error`);
  });
});
