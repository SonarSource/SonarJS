/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { describe, it, before, after } from 'node:test';
import { expect } from 'expect';
import * as grpc from '@grpc/grpc-js';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { analyzer } from '../src/proto/language_analyzer.js';

// Use a random high port to avoid conflicts
const TEST_PORT = 50051;
const SERVICE_NAME = 'analyzer.LanguageAnalyzerService';

/**
 * Create a gRPC client for the LanguageAnalyzerService using static generated code
 */
function createClient(port: number): {
  analyzeFile: (request: analyzer.IAnalyzeFileRequest) => Promise<analyzer.IAnalyzeFileResponse>;
  close: () => void;
} {
  const methodDefinition: grpc.MethodDefinition<
    analyzer.IAnalyzeFileRequest,
    analyzer.IAnalyzeFileResponse
  > = {
    path: `/${SERVICE_NAME}/AnalyzeFile`,
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: analyzer.IAnalyzeFileRequest) =>
      Buffer.from(analyzer.AnalyzeFileRequest.encode(value).finish()),
    requestDeserialize: (buffer: Buffer) =>
      analyzer.AnalyzeFileRequest.decode(buffer) as unknown as analyzer.IAnalyzeFileRequest,
    responseSerialize: (value: analyzer.IAnalyzeFileResponse) =>
      Buffer.from(analyzer.AnalyzeFileResponse.encode(value).finish()),
    responseDeserialize: (buffer: Buffer) =>
      analyzer.AnalyzeFileResponse.decode(buffer) as unknown as analyzer.IAnalyzeFileResponse,
  };

  const serviceDefinition = {
    AnalyzeFile: methodDefinition,
  } as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;

  // Create the client
  const Client = grpc.makeGenericClientConstructor(serviceDefinition, 'LanguageAnalyzerService');
  const client = new Client(`localhost:${port}`, grpc.credentials.createInsecure());

  return {
    analyzeFile: (
      request: analyzer.IAnalyzeFileRequest,
    ): Promise<analyzer.IAnalyzeFileResponse> => {
      return new Promise((resolve, reject) => {
        client.makeUnaryRequest(
          `/${SERVICE_NAME}/AnalyzeFile`,
          methodDefinition.requestSerialize,
          methodDefinition.responseDeserialize,
          request,
          (error: grpc.ServiceError | null, response?: analyzer.IAnalyzeFileResponse) => {
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

describe('gRPC server bundle e2e', () => {
  let client: ReturnType<typeof createClient>;

  before(async () => {
    client = createClient(TEST_PORT);
  });

  after(async () => {
    client?.close();
  });

  it('should analyze a JavaScript file and return issues', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/nested-if.js',
          content: 'if (a) { if (b) { if (c) { if (d) { console.log("deep"); } } } }\n',
        },
      ],
      activeRules: [
        {
          ruleKey: 'S134',
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule).toBe('S134');
    expect(issues[0].message).toContain('Refactor this code to not nest more than');
  });

  it('should analyze a TypeScript file and return issues', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/nested-if.ts',
          content: 'if (a) { if (b) { if (c) { if (d) { console.log("deep"); } } } }\n',
        },
      ],
      activeRules: [
        {
          ruleKey: 'S134',
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule).toBe('S134');
    expect(issues[0].message).toContain('Refactor this code to not nest more than');
  });

  it('should analyze TypeScript file with type-checker dependent rule', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/in-operator.ts',
          content:
            'const arr: string[] = ["a", "b", "c"];\nif ("b" in arr) { console.log("found"); }\n',
        },
      ],
      activeRules: [
        {
          ruleKey: 'S4619',
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule).toBe('S4619');
    expect(issues[0].message).toContain('indexOf');
  });

  it('should analyze JavaScript file with type-checker dependent rule', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/in-operator.js',
          content: 'const arr = ["a", "b", "c"];\nif ("b" in arr) { console.log("found"); }\n',
        },
      ],
      activeRules: [
        {
          ruleKey: 'S4619',
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule).toBe('S4619');
    expect(issues[0].message).toContain('indexOf');
  });
});
