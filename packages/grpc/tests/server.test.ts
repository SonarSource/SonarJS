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
  analyze: (request: analyzer.IAnalyzeRequest) => Promise<analyzer.IAnalyzeResponse>;
  close: () => void;
} {
  const methodDefinition: grpc.MethodDefinition<
    analyzer.IAnalyzeRequest,
    analyzer.IAnalyzeResponse
  > = {
    path: `/${SERVICE_NAME}/Analyze`,
    requestStream: false,
    responseStream: false,
    requestSerialize: (value: analyzer.IAnalyzeRequest) =>
      Buffer.from(analyzer.AnalyzeRequest.encode(value).finish()),
    requestDeserialize: (buffer: Buffer) => analyzer.AnalyzeRequest.decode(buffer),
    responseSerialize: (value: analyzer.IAnalyzeResponse) =>
      Buffer.from(analyzer.AnalyzeResponse.encode(value).finish()),
    responseDeserialize: (buffer: Buffer) => analyzer.AnalyzeResponse.decode(buffer),
  };

  const serviceDefinition = {
    Analyze: methodDefinition,
  } as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;

  // Create the client
  const Client = grpc.makeGenericClientConstructor(serviceDefinition, 'LanguageAnalyzerService');
  const client = new Client(`localhost:${port}`, grpc.credentials.createInsecure());

  return {
    analyze: (request: analyzer.IAnalyzeRequest): Promise<analyzer.IAnalyzeResponse> => {
      return new Promise((resolve, reject) => {
        client.makeUnaryRequest(
          `/${SERVICE_NAME}/Analyze`,
          methodDefinition.requestSerialize,
          methodDefinition.responseDeserialize,
          request,
          (error: grpc.ServiceError | null, response?: analyzer.IAnalyzeResponse) => {
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
  let analysisCounter = 0;

  function generateAnalysisId(): string {
    analysisCounter++;
    return `test-analysis-${analysisCounter}`;
  }

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
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/empty.ts',
          content: '// empty file\n',
        },
      ],
      activeRules: [],
    };

    const response = await client.analyze(request);

    expect(response).toBeDefined();
    expect(response.issues || []).toEqual([]);
  });

  it('should analyze a JavaScript file and return issues', async () => {
    // Use a JS rule that works without type information
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/nested-if.js',
          content: 'if (a) { if (b) { if (c) { if (d) { console.log("deep"); } } } }\n',
        },
      ],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S134' }, // Control flow statements should not be nested too deeply
          params: [],
        },
      ],
    };

    const response = await client.analyze(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    const issue = issues[0];
    expect(issue.rule?.repo).toBe('javascript');
    expect(issue.rule?.rule).toBe('S134');
    expect(issue.message).toContain('Refactor this code to not nest more than');
  });

  it('should analyze a TypeScript file and return issues', async () => {
    // Use a TS rule that works without type information
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/nested-if.ts',
          content: 'if (a) { if (b) { if (c) { if (d) { console.log("deep"); } } } }\n',
        },
      ],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S134' }, // Control flow statements should not be nested too deeply
          params: [],
        },
      ],
    };

    const response = await client.analyze(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    const issue = issues[0];
    expect(issue.rule?.repo).toBe('typescript');
    expect(issue.rule?.rule).toBe('S134');
    expect(issue.message).toContain('Refactor this code to not nest more than');
  });

  it('should analyze a JavaScript file', async () => {
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/empty-statement.js',
          content: 'const x = 1;;\n',
        },
      ],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S1116' },
          params: [],
        },
      ],
    };

    const response = await client.analyze(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    const issue = issues[0];
    expect(issue.rule?.repo).toBe('javascript');
    expect(issue.rule?.rule).toBe('S1116');
    expect(issue.message).toBe('Unnecessary semicolon.');
  });

  it('should handle multiple files in a single request', async () => {
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
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
          ruleKey: { repo: 'javascript', rule: 'S1116' },
          params: [],
        },
      ],
    };

    const response = await client.analyze(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(2);
    const filePaths = issues.map(i => i.filePath);
    expect(filePaths.some(p => p?.endsWith('/project/src/file1.js'))).toBe(true);
    expect(filePaths.some(p => p?.endsWith('/project/src/file2.js'))).toBe(true);
  });

  it('should handle parsing errors', async () => {
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/syntax-error.ts',
          content: 'const x = {{\n', // Invalid syntax
        },
      ],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S4621' },
          params: [],
        },
      ],
    };

    const response = await client.analyze(request);

    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule?.repo).toBe('javascript');
    expect(issues[0].rule?.rule).toBe('S2260');
  });

  it('should handle rules with number parameters', async () => {
    // S104 (TooManyLinesInFile) has a configurable maximum line threshold
    const fileContent = 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\n';

    // With maximum=3, should trigger (5 > 3)
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/max-lines.js', content: fileContent }],
      activeRules: [
        { ruleKey: { repo: 'javascript', rule: 'S104' }, params: [{ key: 'maximum', value: '3' }] },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.repo).toBe('javascript');
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S104');

    // With maximum=10, should NOT trigger (5 < 10)
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/max-lines.js', content: fileContent }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S104' },
          params: [{ key: 'maximum', value: '10' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should handle rules with string parameters', async () => {
    // S100 (FunctionName) has a configurable format regex
    const fileContent = 'function MyFunction() { return 1; }\n';

    // With lowercase-first pattern, should trigger
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/function-name.js', content: fileContent }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S100' },
          params: [{ key: 'format', value: '^[a-z][a-zA-Z0-9]*$' }],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.repo).toBe('javascript');
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S100');
    expect(responseTrigger.issues?.[0].message).toContain('MyFunction');

    // With uppercase-allowed pattern, should NOT trigger
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/function-name.js', content: fileContent }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S100' },
          params: [{ key: 'format', value: '^[A-Z][a-zA-Z0-9]*$' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should handle rules with array parameters', async () => {
    // S2068 (HardcodedCredentials) has a configurable passwordWords array
    const fileContent = 'const secret = "hardcoded123";\n';

    // With 'secret' in the list, should trigger
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/credentials.js', content: fileContent }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S2068' },
          params: [{ key: 'passwordWords', value: 'secret,token,apikey' }],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.repo).toBe('javascript');
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S2068');

    // Without 'secret' in the list, should NOT trigger
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/credentials.js', content: fileContent }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S2068' },
          params: [{ key: 'passwordWords', value: 'password,token,apikey' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should analyze TypeScript file with type-checker dependent rule', async () => {
    // S4619 ("in" should not be used on arrays) requires type checking
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
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
          ruleKey: { repo: 'javascript', rule: 'S4619' },
          params: [],
        },
      ],
    };

    const response = await client.analyze(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule?.repo).toBe('typescript');
    expect(issues[0].rule?.rule).toBe('S4619');
    expect(issues[0].message).toContain('indexOf');
  });

  it('should analyze JavaScript file with type-checker dependent rule', async () => {
    // S4619 ("in" should not be used on arrays) requires type checking
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [
        {
          relativePath: '/project/src/in-operator.js',
          content: 'const arr = ["a", "b", "c"];\nif ("b" in arr) { console.log("found"); }\n',
        },
      ],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S4619' },
          params: [],
        },
      ],
    };

    const response = await client.analyze(request);
    const issues = response.issues || [];

    expect(issues.length).toBe(1);
    expect(issues[0].rule?.repo).toBe('javascript');
    expect(issues[0].rule?.rule).toBe('S4619');
    expect(issues[0].message).toContain('indexOf');
  });

  it('should handle rules with mixed primitive and object parameters', async () => {
    // S1105 (BraceStyle) has a mixed config:
    // - First element: primitive with displayName 'braceStyle' (default: '1tbs')
    // - Second element: object with field 'allowSingleLine' (default: true)
    // ESLint config: ['1tbs', { allowSingleLine: true }]

    // Code with Allman brace style (brace on new line)
    const fileContent = `function foo()
{
  return 1;
}
`;

    // With default '1tbs' style, Allman should trigger an issue
    const requestDefault: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/brace-style.js', content: fileContent }],
      activeRules: [{ ruleKey: { repo: 'javascript', rule: 'S1105' }, params: [] }],
    };

    const responseDefault = await client.analyze(requestDefault);
    expect(responseDefault.issues?.length).toBe(1);
    expect(responseDefault.issues?.[0].rule?.repo).toBe('javascript');
    expect(responseDefault.issues?.[0].rule?.rule).toBe('S1105');

    // With 'allman' style, should NOT trigger
    const requestAllman: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/brace-style.js', content: fileContent }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S1105' },
          params: [{ key: 'braceStyle', value: 'allman' }],
        },
      ],
    };

    const responseAllman = await client.analyze(requestAllman);
    expect(responseAllman.issues?.length).toBe(0);
  });
});
