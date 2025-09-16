/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import estree from 'estree';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { build, composeSyntheticFilePath } from '../../../jsts/src/embedded/builder/build.js';
import { parseAwsFromYaml } from '../../src/aws/parser.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { embeddedInput } from '../../../jsts/tests/tools/helpers/input.js';

describe('buildSourceCodes()', () => {
  const fixturesPath = join(import.meta.dirname, 'fixtures', 'build');
  it('should build source code from YAML lambda file', async () => {
    const filePath = join(fixturesPath, 'valid-lambda.yaml');
    const sourceCodes = build(await embeddedInput({ filePath }), parseAwsFromYaml);
    expect(sourceCodes).toHaveLength(1);
    expect(sourceCodes[0].sourceCode.ast.loc.start).toEqual({ line: 8, column: 17 });
  });

  it('should build source code from YAML serverless file', async () => {
    const filePath = join(fixturesPath, 'valid-serverless.yaml');
    const sourceCodes = build(await embeddedInput({ filePath }), parseAwsFromYaml);
    expect(sourceCodes).toHaveLength(1);
    expect(sourceCodes[0].sourceCode.ast.loc.start).toEqual({ line: 7, column: 18 });
  });

  it('should return YAML parsing errors on invalid YAML file', async () => {
    const analysisInput = await embeddedInput({ filePath: join(fixturesPath, 'malformed.yaml') });
    expect(() => build(analysisInput, parseAwsFromYaml)).toThrow(
      APIError.parsingError('Map keys must be unique', { line: 2 }),
    );
  });

  it('should return a parsing error on invalid plain inline JS', async () => {
    const analysisInput = await embeddedInput({
      filePath: join(fixturesPath, 'invalid-plain-inline-js.yaml'),
    });
    expect(() => build(analysisInput, parseAwsFromYaml)).toThrow(
      APIError.parsingError(`Unexpected token ','. (7:22)`, { line: 7 }),
    );
  });

  it('should return a parsing error on invalid block inline JS', async () => {
    const analysisInput = await embeddedInput({
      filePath: join(fixturesPath, 'invalid-block-inline-js.yaml'),
    });
    expect(() => build(analysisInput, parseAwsFromYaml)).toThrow(
      APIError.parsingError(`Unexpected token ','. (8:15)`, { line: 8 }),
    );
  });

  it('it should not build a source code for an unsupported format', async () => {
    const filePath = join(fixturesPath, 'unsupported-format.yaml');
    const sourceCodes = build(await embeddedInput({ filePath }), parseAwsFromYaml);
    expect(sourceCodes).toHaveLength(0);
  });

  it('should fix plain-based format locations', async () => {
    const filePath = join(fixturesPath, 'flow-plain.yaml');
    const [
      {
        sourceCode: { ast },
      },
    ] = build(await embeddedInput({ filePath }), parseAwsFromYaml);

    const {
      body: [ifStmt],
    } = ast;
    expect(ifStmt.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 18,
        },
        end: {
          line: 7,
          column: 67,
        },
      }),
    );
    expect(ifStmt.range).toEqual([170, 219]);

    const alternate = (ifStmt as estree.IfStatement).alternate!;
    expect(alternate.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 57,
        },
        end: {
          line: 7,
          column: 67,
        },
      }),
    );
    expect(alternate.range).toEqual([209, 219]);

    const {
      comments: [comment],
    } = ast;
    expect(comment.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 38,
        },
        end: {
          line: 7,
          column: 49,
        },
      }),
    );
    expect(comment.range).toEqual([190, 201]);

    const elseToken = ast.tokens.find(token => token.value === 'else')!;
    expect(elseToken.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 7,
          column: 52,
        },
        end: {
          line: 7,
          column: 56,
        },
      }),
    );
    expect(elseToken.range).toEqual([204, 208]);
  });

  it('should fix block-folded-based format locations', async () => {
    const filePath = join(fixturesPath, 'block-folded.yaml');
    const [
      {
        sourceCode: { ast },
      },
    ] = build(await embeddedInput({ filePath }), parseAwsFromYaml);
    const {
      body: [ifStmt],
    } = ast;
    expect(ifStmt.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 8,
          column: 8,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(ifStmt.range).toEqual([180, 265]);

    const alternate = (ifStmt as estree.IfStatement).alternate!;
    expect(alternate.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 15,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(alternate.range).toEqual([237, 265]);

    const {
      comments: [comment],
    } = ast;
    expect(comment.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 9,
          column: 17,
        },
        end: {
          line: 9,
          column: 28,
        },
      }),
    );
    expect(comment.range).toEqual([210, 221]);

    const elseToken = ast.tokens.find(token => token.value === 'else')!;
    expect(elseToken.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 10,
        },
        end: {
          line: 10,
          column: 14,
        },
      }),
    );
    expect(elseToken.range).toEqual([232, 236]);
  });

  it('should fix block-literal-based format locations', async () => {
    const filePath = join(fixturesPath, 'block-literal.yaml');
    const [
      {
        sourceCode: { ast },
      },
    ] = build(await embeddedInput({ filePath }), parseAwsFromYaml);
    const {
      body: [ifStmt],
    } = ast;
    expect(ifStmt.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 8,
          column: 8,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(ifStmt.range).toEqual([180, 265]);

    const alternate = (ifStmt as estree.IfStatement).alternate!;
    expect(alternate.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 15,
        },
        end: {
          line: 12,
          column: 9,
        },
      }),
    );
    expect(alternate.range).toEqual([237, 265]);

    const {
      comments: [comment],
    } = ast;
    expect(comment.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 9,
          column: 17,
        },
        end: {
          line: 9,
          column: 28,
        },
      }),
    );
    expect(comment.range).toEqual([210, 221]);

    const elseToken = ast.tokens.find(token => token.value === 'else')!;
    expect(elseToken.loc).toEqual(
      expect.objectContaining({
        start: {
          line: 10,
          column: 10,
        },
        end: {
          line: 10,
          column: 14,
        },
      }),
    );
    expect(elseToken.range).toEqual([232, 236]);
  });

  it('should compose a synthetic file path', async () => {
    const filePath = join(fixturesPath, 'synthetic-filename.yaml');
    const [firstExtendedSourceCode, secondExtendedSourceCode] = build(
      await embeddedInput({ filePath }),
      parseAwsFromYaml,
    );
    const firstFunctionName = composeSyntheticFilePath(filePath, 'SomeLambdaFunction');
    const secondFunctionName = composeSyntheticFilePath(filePath, 'SomeServerlessFunction');
    expect(firstExtendedSourceCode.syntheticFilePath).toEqual(firstFunctionName);
    expect(secondExtendedSourceCode.syntheticFilePath).toEqual(secondFunctionName);
  });
});

describe('composeSyntheticFilePath()', () => {
  it('should append the function name at the end of the filename, before the extension', () => {
    const composedFilename = composeSyntheticFilePath('hello.yaml', 'there');
    expect(composedFilename).toEqual('hello-there.yaml');
  });
});
