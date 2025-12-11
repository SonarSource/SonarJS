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
import { startServer } from '../src/server.js';
import { analyzer } from '../src/proto/language_analyzer.js';

// Use a random high port to avoid conflicts
const TEST_PORT = 50151;
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
    requestDeserialize: (buffer: Buffer) => analyzer.AnalyzeFileRequest.decode(buffer),
    responseSerialize: (value: analyzer.IAnalyzeFileResponse) =>
      Buffer.from(analyzer.AnalyzeFileResponse.encode(value).finish()),
    responseDeserialize: (buffer: Buffer) => analyzer.AnalyzeFileResponse.decode(buffer),
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

describe('gRPC server', () => {
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

  it('should start and accept connections', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/empty.ts',
          content: '// empty file\n',
        },
      ],
      activeRules: [],
    };

    const response = await client.analyzeFile(request);

    expect(response).toBeDefined();
    expect(response.issues || []).toEqual([]);
  });

  it('should analyze a JavaScript file and return issues', async () => {
    // Use a JS rule that works without type information
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
          ruleKey: 'S134', // Control flow statements should not be nested too deeply
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    const issue = issues[0];
    expect(issue.rule).toBe('S134');
    expect(issue.message).toContain('Refactor this code to not nest more than');
  });

  it('should analyze a TypeScript file and return issues', async () => {
    // Use a TS rule that works without type information
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
          ruleKey: 'S134', // Control flow statements should not be nested too deeply
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    const issue = issues[0];
    expect(issue.rule).toBe('S134');
    expect(issue.message).toContain('Refactor this code to not nest more than');
  });

  it('should analyze a JavaScript file', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/empty-statement.js',
          content: 'const x = 1;;\n',
        },
      ],
      activeRules: [
        {
          ruleKey: 'S1116',
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    const issue = issues[0];
    expect(issue.rule).toBe('S1116');
    expect(issue.message).toBe('Unnecessary semicolon.');
  });

  it('should handle multiple files in a single request', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/file1.js',
          content: 'const x = 1;;\n', // Empty statement
        },
        {
          relativePath: '/project/src/file2.js',
          content: 'const y = 2;;\n', // Empty statement
        },
      ],
      activeRules: [
        {
          ruleKey: 'S1116',
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(2);
    const filePaths = issues.map(i => i.filePath);
    expect(filePaths.some(p => p?.endsWith('/project/src/file1.js'))).toBe(true);
    expect(filePaths.some(p => p?.endsWith('/project/src/file2.js'))).toBe(true);
  });

  it('should handle parsing errors', async () => {
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/syntax-error.ts',
          content: 'const x = {{\n', // Invalid syntax
        },
      ],
      activeRules: [
        {
          ruleKey: 'S4621',
          params: [],
        },
      ],
    };

    const response = await client.analyzeFile(request);

    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule).toBe('S2260');
  });

  it('should handle rules with parameters', async () => {
    // S104 (TooManyLinesInFile) has a configurable maximum line threshold
    const request: analyzer.IAnalyzeFileRequest = {
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/max-lines.js',
          // 5 lines of code
          content: 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\n',
        },
      ],
      activeRules: [
        {
          ruleKey: 'S104',
          params: [
            { key: 'maximum', value: '3' }, // Trigger rule if more than 3 lines
          ],
        },
      ],
    };

    const response = await client.analyzeFile(request);
    const issues = response.issues || [];

    // Should detect too many lines (5 > 3)
    expect(response).toBeDefined();
    expect(issues.length).toBe(1);
    expect(issues[0].rule).toBe('S104');
  });

  it('should analyze TypeScript file with type-checker dependent rule', async () => {
    // S4619 ("in" should not be used on arrays) requires type checking
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
    // S4619 ("in" should not be used on arrays) requires type checking
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
