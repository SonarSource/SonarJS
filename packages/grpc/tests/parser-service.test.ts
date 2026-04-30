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
import { describe, it, before, after } from 'node:test';
import { expect } from 'expect';
import * as grpc from '@grpc/grpc-js';
import { startServer } from '../src/server.js';
import { sonarjs } from '../src/proto/parser.js';
import { estree } from '../../analysis/src/jsts/parsers/estree.js';

const TEST_PORT = 50152;
const SERVICE_NAME = 'sonarjs.parser.v1.ParserService';

type IParseRequest = sonarjs.parser.v1.IParseRequest;
type IParseResponse = sonarjs.parser.v1.IParseResponse;

function createClient(port: number): {
  parse: (request: IParseRequest) => Promise<IParseResponse>;
  close: () => void;
} {
  const methodDefinition: grpc.MethodDefinition<IParseRequest, IParseResponse> = {
    path: `/${SERVICE_NAME}/Parse`,
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: IParseRequest) =>
      Buffer.from(sonarjs.parser.v1.ParseRequest.encode(value).finish()),
    requestDeserialize: (buffer: Buffer) => sonarjs.parser.v1.ParseRequest.decode(buffer),
    responseSerialize: (value: IParseResponse) =>
      Buffer.from(sonarjs.parser.v1.ParseResponse.encode(value).finish()),
    responseDeserialize: (buffer: Buffer) => sonarjs.parser.v1.ParseResponse.decode(buffer),
  };

  const serviceDefinition = {
    Parse: methodDefinition,
  } as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;

  const Client = grpc.makeGenericClientConstructor(serviceDefinition, 'ParserService');
  const client = new Client(`localhost:${port}`, grpc.credentials.createInsecure());

  return {
    parse: (request: IParseRequest): Promise<IParseResponse> => {
      return new Promise((resolve, reject) => {
        client.makeUnaryRequest(
          `/${SERVICE_NAME}/Parse`,
          methodDefinition.requestSerialize,
          methodDefinition.responseDeserialize,
          request,
          (error: grpc.ServiceError | null, response?: IParseResponse) => {
            if (error) {
              reject(error);
            } else {
              resolve(response!);
            }
          },
        );
      });
    },
    close: () => {
      client.close();
    },
  };
}

function decodeAst(ast: Uint8Array | undefined | null) {
  expect(ast).toBeDefined();
  expect(ast!.length).toBeGreaterThan(0);
  return estree.Node.decode(ast!);
}

describe('gRPC server ParserService', () => {
  let server: grpc.Server;
  let client: ReturnType<typeof createClient>;

  before(async () => {
    server = await startServer(TEST_PORT);
    client = createClient(TEST_PORT);
  });

  after(async () => {
    client.close();
    await new Promise<void>((resolve, reject) => {
      server.tryShutdown(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  it('should parse a JavaScript file and return its AST', async () => {
    const response = await client.parse({
      sourceFile: { relativePath: 'test.js', content: 'const x = 1;' },
    });

    expect(response.parsingErrors ?? []).toEqual([]);
    const decoded = decodeAst(response.ast as Uint8Array);
    expect(decoded.type).toBe(estree.NodeType.ProgramType);

    const program = (decoded as any).program;
    expect(program.body).toHaveLength(1);
    const decl = program.body[0];
    expect(decl.type).toBe(estree.NodeType.VariableDeclarationType);
    expect(decl.variableDeclaration.kind).toBe('const');
    const declarator = decl.variableDeclaration.declarations[0];
    expect(declarator.variableDeclarator.id.identifier.name).toBe('x');
  });

  it('should parse a TypeScript file with type annotations', async () => {
    const response = await client.parse({
      sourceFile: {
        relativePath: 'test.ts',
        content: 'const x: number = 1;',
        sonarLanguage: 'ts',
      },
    });

    expect(response.parsingErrors ?? []).toEqual([]);
    const decoded = decodeAst(response.ast as Uint8Array);
    const program = (decoded as any).program;
    const decl = program.body[0];
    expect(decl.type).toBe(estree.NodeType.VariableDeclarationType);
    const declarator = decl.variableDeclaration.declarations[0];
    expect(declarator.variableDeclarator.id.identifier.name).toBe('x');
  });

  it('should infer TypeScript from .ts extension when sonar_language is missing', async () => {
    const response = await client.parse({
      sourceFile: {
        relativePath: 'inferred.ts',
        content: 'const x: number = 1;',
      },
    });

    expect(response.parsingErrors ?? []).toEqual([]);
    const decoded = decodeAst(response.ast as Uint8Array);
    expect(decoded.type).toBe(estree.NodeType.ProgramType);
  });

  it('should report a ParsingError on syntax error and leave ast empty', async () => {
    const response = await client.parse({
      sourceFile: { relativePath: 'broken.js', content: 'const x = ;' },
    });

    expect(response.ast == null || (response.ast as Uint8Array).length === 0).toBe(true);
    const errors = response.parsingErrors ?? [];
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(sonarjs.parser.v1.ParsingErrorCode.PARSING_ERROR_CODE_PARSING);
    expect(errors[0].message).toBeTruthy();
    expect(errors[0].line).toBe(1);
  });

  it('should support JSX content via the Babel fallback parser', async () => {
    const response = await client.parse({
      sourceFile: { relativePath: 'comp.jsx', content: 'const c = <div />;' },
    });

    expect(response.parsingErrors ?? []).toEqual([]);
    const decoded = decodeAst(response.ast as Uint8Array);
    const init = (decoded as any).program.body[0].variableDeclaration.declarations[0]
      .variableDeclarator.init;
    expect(init.type).toBe(estree.NodeType.JSXElementType);
  });

  it('should unwrap TS-only nodes (TSAsExpression) from the AST', async () => {
    const response = await client.parse({
      sourceFile: {
        relativePath: 'cast.ts',
        content: 'const x = 1 as number;',
        sonarLanguage: 'ts',
      },
    });

    expect(response.parsingErrors ?? []).toEqual([]);
    const decoded = decodeAst(response.ast as Uint8Array);
    const init = (decoded as any).program.body[0].variableDeclaration.declarations[0]
      .variableDeclarator.init;
    expect(init.type).toBe(estree.NodeType.LiteralType);
  });

  it('should recover from a parse error and serve subsequent valid requests', async () => {
    const failed = await client.parse({
      sourceFile: { relativePath: 'bad.js', content: 'const x = ;' },
    });
    expect(failed.parsingErrors ?? []).toHaveLength(1);

    const ok = await client.parse({
      sourceFile: { relativePath: 'good.js', content: 'const x = 1;' },
    });
    expect(ok.parsingErrors ?? []).toEqual([]);
    const decoded = decodeAst(ok.ast as Uint8Array);
    expect(decoded.type).toBe(estree.NodeType.ProgramType);
  });
});
