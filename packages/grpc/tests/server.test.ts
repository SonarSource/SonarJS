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

  it('should analyze TypeScript file with relative paths with type-checker dependent rule', async () => {
    // S4619 ("in" should not be used on arrays) requires type checking
    const request: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [
        {
          relativePath: 'src/in-operator.ts',
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

  it('should handle Type C rule with numeric threshold (S3776 — cognitive complexity)', async () => {
    // Three nested ifs: cognitive complexity = 1+2+3 = 6
    const content =
      'function f(a, b, c) { if (a) { if (b) { if (c) { return 1; } } } return 0; }\n';

    // threshold=5: complexity 6 exceeds it → issue
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/cognitive.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S3776' },
          params: [{ key: 'threshold', value: '5' }],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S3776');

    // threshold=10: complexity 6 is within limit → no issue
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/cognitive.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S3776' },
          params: [{ key: 'threshold', value: '10' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should handle rule with customForConfiguration and customDefault (S1441 — quotes)', async () => {
    // S1441 has customDefault: true and customForConfiguration: `value ? "single" : "double"`
    // When SQ sends singleQuotes='true', it should be transformed to 'single' for ESLint
    const content = 'const x = "hello";\n';

    // With singleQuotes='true' → should enforce single quotes → issue on double-quoted string
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/quotes.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S1441' },
          params: [{ key: 'singleQuotes', value: 'true' }],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S1441');

    // With singleQuotes='false' → should enforce double quotes → no issue on double-quoted string
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/quotes.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S1441' },
          params: [{ key: 'singleQuotes', value: 'false' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should handle customDefault with number field in object config (S6418 — hard-coded secrets)', async () => {
    // S6418 config.ts has randomnessSensibility with default: 5 (number) and customDefault: '5.0' (string for Java).
    // The gRPC path should parse 'randomnessSensibility' as a number (from default: 5).
    // Also tests that 'secretWords' string param is passed correctly.
    // Needs a high-entropy string to exceed the sensibility threshold.
    const content =
      "const token = 'rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVVcgVuAIOB6hzcWjDnv16V6hDLevW0Qs4hKPbP1M4YfuDI16sZna1/VGRLkAbTk6xMPs4epH6A3ZqSyyI-H92y';\n";

    // With default secretWords (contains 'token') and default sensibility → should trigger
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/secrets.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S6418' },
          params: [{ key: 'randomnessSensibility', value: '2' }],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S6418');

    // With secretWords that doesn't match 'token' → should NOT trigger
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/secrets.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S6418' },
          params: [
            { key: 'secretWords', value: 'mysecretword' },
            { key: 'randomnessSensibility', value: '2' },
          ],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should handle customDefault with escaped regex string (S139 — trailing comments)', async () => {
    // S139 (line-comment-position) config.ts has ignorePattern with default: '^\\s*[^\\s]+$'
    // and customDefault: '^\\\\s*[^\\\\s]+$' (double-escaped for Java).
    // The SQ key is 'pattern' (displayName).

    // Multi-word trailing comment doesn't match default ignorePattern → should trigger
    const content = 'const x = 1; // some trailing comment\n';

    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/comments-trigger.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S139' },
          params: [],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S139');

    // Custom pattern override via 'pattern' (displayName for ignorePattern):
    // '^\\s*some' matches '// some trailing comment' → should NOT trigger
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/comments-custom.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S139' },
          params: [{ key: 'pattern', value: '^\\s*some' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should handle customDefault with array of escaped regexes (S7718 — catch error name)', async () => {
    // S7718 config.ts has ignore field with default: array of regexes and
    // customDefault: same array with double-escaped regexes (for Java).
    // The gRPC path should split comma-separated values into an array.
    const content = 'try { foo(); } catch (myVar) { throw myVar; }\n';

    // Default ignore patterns don't include 'myVar' → should trigger
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/catch.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S7718' },
          params: [],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBe(1);
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S7718');

    // Custom ignore that matches 'myVar' → should NOT trigger
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/catch.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S7718' },
          params: [{ key: 'ignore', value: '^myVar$' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  it('should handle Type B rule where first param value is used as config (S1440 — eqeqeq)', async () => {
    // x == null is allowed in 'smart' mode (null checks are a known exception)
    // but forbidden in 'always' mode
    const content = 'function f(x) { if (x == null) { return x; } return 0; }\n';

    // 'always': == is never allowed → issue
    const requestTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/eqeqeq.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S1440' },
          params: [{ key: 'mode', value: 'always' }],
        },
      ],
    };

    const responseTrigger = await client.analyze(requestTrigger);
    expect(responseTrigger.issues?.length).toBeGreaterThan(0);
    expect(responseTrigger.issues?.[0].rule?.rule).toBe('S1440');

    // 'smart': null checks with == are explicitly allowed → no issue
    const requestNoTrigger: analyzer.IAnalyzeRequest = {
      analysisId: generateAnalysisId(),
      contextIds: {},
      sourceFiles: [{ relativePath: '/project/src/eqeqeq.js', content }],
      activeRules: [
        {
          ruleKey: { repo: 'javascript', rule: 'S1440' },
          params: [{ key: 'mode', value: 'smart' }],
        },
      ],
    };

    const responseNoTrigger = await client.analyze(requestNoTrigger);
    expect(responseNoTrigger.issues?.length).toBe(0);
  });

  describe('CSS analysis', () => {
    it('should analyze a CSS file and return issues', async () => {
      // S4658 = block-no-empty — triggers on empty blocks
      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [
          {
            relativePath: 'src/styles.css',
            content: 'a { }',
          },
        ],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4658' },
            params: [],
          },
        ],
      };

      const response = await client.analyze(request);
      const issues = response.issues || [];

      expect(issues.length).toBe(1);
      expect(issues[0].rule?.repo).toBe('css');
      expect(issues[0].rule?.rule).toBe('S4658');
      expect(issues[0].filePath).toMatch(/src\/styles\.css$/);
      expect(issues[0].textRange?.startLine).toBe(1);
      expect(issues[0].textRange?.startLineOffset).toBe(2);
      expect(issues[0].textRange?.endLine).toBe(1);
      expect(issues[0].textRange?.endLineOffset).toBe(5);
    });

    it('should analyze a SCSS file and return issues', async () => {
      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [
          {
            relativePath: 'src/styles.scss',
            content: '.foo { }',
          },
        ],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4658' },
            params: [],
          },
        ],
      };

      const response = await client.analyze(request);
      const issues = response.issues || [];

      expect(issues.length).toBe(1);
      expect(issues[0].rule?.repo).toBe('css');
    });

    it('should return no issues for valid CSS', async () => {
      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [
          {
            relativePath: 'src/valid.css',
            content: 'a { color: red; }',
          },
        ],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4658' },
            params: [],
          },
        ],
      };

      const response = await client.analyze(request);
      expect(response.issues?.length).toBe(0);
    });

    it('should ignore CSS rules for JS files', async () => {
      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [
          {
            relativePath: 'src/app.js',
            content: 'const x = 1;',
          },
        ],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4658' },
            params: [],
          },
        ],
      };

      const response = await client.analyze(request);
      expect(response.issues?.length).toBe(0);
    });

    it('should handle mixed JS and CSS files in one request', async () => {
      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [
          {
            relativePath: 'src/app.js',
            content: 'const x = 1;',
          },
          {
            relativePath: 'src/styles.css',
            content: 'a { }',
          },
        ],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4658' },
            params: [],
          },
        ],
      };

      const response = await client.analyze(request);
      const issues = response.issues || [];

      expect(issues.length).toBe(1);
      expect(issues[0].rule?.repo).toBe('css');
    });

    it('should apply CSS rule ignoreParams (default and override)', async () => {
      // S4659 = selector-pseudo-class-no-unknown
      // Default ignorePseudoClasses includes 'global', so :global is allowed
      const requestNoIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content: 'a:global { color: red; }' }],
        activeRules: [{ ruleKey: { repo: 'css', rule: 'S4659' }, params: [] }],
      };

      const responseNoIssue = await client.analyze(requestNoIssue);
      expect(responseNoIssue.issues?.length).toBe(0);

      // Explicit ignorePseudoClasses that excludes 'global' should trigger
      const requestIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content: 'a:global { color: red; }' }],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4659' },
            params: [{ key: 'ignorePseudoClasses', value: 'local' }],
          },
        ],
      };

      const responseIssue = await client.analyze(requestIssue);
      expect(responseIssue.issues?.length).toBe(1);
      expect(responseIssue.issues?.[0].rule?.rule).toBe('S4659');
    });

    it('should apply CSS rule booleanParam (ignoreFallbacks)', async () => {
      // S4656 = declaration-block-no-duplicate-properties
      // Default ignoreFallbacks=true: consecutive fallbacks with different values are allowed
      const content = 'a { background: url("x.png"); background: linear-gradient(red, blue); }';

      const requestNoIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content }],
        activeRules: [{ ruleKey: { repo: 'css', rule: 'S4656' }, params: [] }],
      };

      const responseNoIssue = await client.analyze(requestNoIssue);
      expect(responseNoIssue.issues?.length).toBe(0);

      // With ignoreFallbacks=false, duplicate properties should trigger
      const requestIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content }],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4656' },
            params: [{ key: 'ignoreFallbacks', value: 'false' }],
          },
        ],
      };

      const responseIssue = await client.analyze(requestIssue);
      expect(responseIssue.issues?.length).toBe(1);
      expect(responseIssue.issues?.[0].rule?.rule).toBe('S4656');
    });

    it('should not produce CSS issues when no CSS rules are active', async () => {
      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [
          {
            relativePath: 'src/styles.css',
            content: 'a { }',
          },
        ],
        activeRules: [],
      };

      const response = await client.analyze(request);
      expect(response.issues?.length).toBe(0);
    });

    it('should analyze an HTML file and return both JS and CSS issues', async () => {
      const htmlContent = [
        '<html><body>',
        '<script>',
        'function f() { var unused = 1; }', // S1481: unused local variable
        '</script>',
        '<style>',
        'a { }', // S4658: block-no-empty
        '</style>',
        '</body></html>',
      ].join('\n');

      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: '/project/src/page.html', content: htmlContent }],
        activeRules: [
          { ruleKey: { repo: 'javascript', rule: 'S1481' }, params: [] },
          { ruleKey: { repo: 'css', rule: 'S4658' }, params: [] },
        ],
      };

      const response = await client.analyze(request);
      const issues = response.issues || [];

      const jsIssues = issues.filter(i => i.rule?.repo === 'javascript');
      const cssIssues = issues.filter(i => i.rule?.repo === 'css');

      expect(jsIssues.length).toBeGreaterThan(0);
      expect(cssIssues.length).toBeGreaterThan(0);
      expect(cssIssues[0].rule?.rule).toBe('S4658');
    });

    it('should analyze a Vue file and return both JS and CSS issues', async () => {
      const vueContent = [
        '<template><div/></template>',
        '<script>',
        'function f() { var unused = 1; }', // S1481: unused local variable
        '</script>',
        '<style>',
        'a { }', // S4658: block-no-empty
        '</style>',
      ].join('\n');

      const request: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: '/project/src/component.vue', content: vueContent }],
        activeRules: [
          { ruleKey: { repo: 'javascript', rule: 'S1481' }, params: [] },
          { ruleKey: { repo: 'css', rule: 'S4658' }, params: [] },
        ],
      };

      const response = await client.analyze(request);
      const issues = response.issues || [];

      const jsIssues = issues.filter(i => i.rule?.repo === 'javascript');
      const cssIssues = issues.filter(i => i.rule?.repo === 'css');

      expect(jsIssues.length).toBeGreaterThan(0);
      expect(cssIssues.length).toBeGreaterThan(0);
      expect(cssIssues[0].rule?.rule).toBe('S4658');
    });

    it('should apply listParam ignoreAtRules to control unknown at-rule behaviour (S4662)', async () => {
      // @tailwind is in the default ignoreAtRules list → no issue
      const content = '@tailwind utilities;\na { color: red; }';

      const requestNoIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content }],
        activeRules: [{ ruleKey: { repo: 'css', rule: 'S4662' }, params: [] }],
      };

      const responseNoIssue = await client.analyze(requestNoIssue);
      expect(responseNoIssue.issues?.length).toBe(0);

      // Override ignoreAtRules without 'tailwind' → @tailwind triggers
      const requestIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content }],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4662' },
            params: [{ key: 'ignoreAtRules', value: 'value,at-root,content' }],
          },
        ],
      };

      const responseIssue = await client.analyze(requestIssue);
      expect(responseIssue.issues?.length).toBe(1);
      expect(responseIssue.issues?.[0].rule?.rule).toBe('S4662');
    });

    it('should apply listParam ignorePseudoElements to control unknown pseudo-element behaviour (S4660)', async () => {
      // ::ng-deep is in the default ignorePseudoElements list → no issue
      const content = 'a::ng-deep { color: red; }';

      const requestNoIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content }],
        activeRules: [{ ruleKey: { repo: 'css', rule: 'S4660' }, params: [] }],
      };

      const responseNoIssue = await client.analyze(requestNoIssue);
      expect(responseNoIssue.issues?.length).toBe(0);

      // Override without 'ng-deep' → ::ng-deep triggers
      const requestIssue: analyzer.IAnalyzeRequest = {
        analysisId: generateAnalysisId(),
        contextIds: {},
        sourceFiles: [{ relativePath: 'src/styles.css', content }],
        activeRules: [
          {
            ruleKey: { repo: 'css', rule: 'S4660' },
            params: [{ key: 'ignorePseudoElements', value: 'v-deep,deep' }],
          },
        ],
      };

      const responseIssue = await client.analyze(requestIssue);
      expect(responseIssue.issues?.length).toBe(1);
      expect(responseIssue.issues?.[0].rule?.rule).toBe('S4660');
    });
  });
});
