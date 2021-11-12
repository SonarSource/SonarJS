/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { start, startServer } from 'server';
import * as http from 'http';
import { promisify } from 'util';
import { join } from 'path';
import { AddressInfo } from 'net';
import { setContext } from 'context';

const expectedResponse = {
  issues: [
    {
      column: 0,
      endColumn: 22,
      endLine: 1,
      line: 1,
      message:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      ruleId: 'no-all-duplicated-branches',
      secondaryLocations: [],
    },
  ],
  highlightedSymbols: [],
  highlights: [
    {
      location: {
        startLine: 1,
        startCol: 0,
        endLine: 1,
        endCol: 2,
      },
      textType: 'KEYWORD',
    },
    {
      location: {
        startLine: 1,
        startCol: 10,
        endLine: 1,
        endCol: 12,
      },
      textType: 'CONSTANT',
    },
    {
      location: {
        startLine: 1,
        startCol: 14,
        endLine: 1,
        endCol: 18,
      },
      textType: 'KEYWORD',
    },
    {
      location: {
        startLine: 1,
        startCol: 19,
        endLine: 1,
        endCol: 21,
      },
      textType: 'CONSTANT',
    },
  ],
  metrics: {
    ncloc: [1],
    commentLines: [],
    nosonarLines: [],
    executableLines: [1],
    functions: 0,
    statements: 3,
    classes: 0,
    complexity: 1,
    cognitiveComplexity: 2,
  },
  cpdTokens: [
    {
      location: {
        startLine: 1,
        startCol: 0,
        endLine: 1,
        endCol: 2,
      },
      image: 'if',
    },
    {
      location: {
        startLine: 1,
        startCol: 3,
        endLine: 1,
        endCol: 4,
      },
      image: '(',
    },
    {
      location: {
        startLine: 1,
        startCol: 4,
        endLine: 1,
        endCol: 8,
      },
      image: 'true',
    },
    {
      location: {
        startLine: 1,
        startCol: 8,
        endLine: 1,
        endCol: 9,
      },
      image: ')',
    },
    {
      location: {
        startLine: 1,
        startCol: 10,
        endLine: 1,
        endCol: 12,
      },
      image: '42',
    },
    {
      location: {
        startLine: 1,
        startCol: 12,
        endLine: 1,
        endCol: 13,
      },
      image: ';',
    },
    {
      location: {
        startLine: 1,
        startCol: 14,
        endLine: 1,
        endCol: 18,
      },
      image: 'else',
    },
    {
      location: {
        startLine: 1,
        startCol: 19,
        endLine: 1,
        endCol: 21,
      },
      image: '42',
    },
    {
      location: {
        startLine: 1,
        startCol: 21,
        endLine: 1,
        endCol: 22,
      },
      image: ';',
    },
  ],
};

describe('server', () => {
  let server: http.Server;
  let close;

  beforeEach(async () => {
    server = await start();
    close = promisify(server.close.bind(server));
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
    });
  });

  afterEach(async () => {
    await close();
  });

  it('should respond to JavaScript analysis request', async () => {
    expect.assertions(2);
    expect(server.listening).toEqual(true);

    await post(
      JSON.stringify({
        rules: [{ key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: 'MAIN' }],
      }),
      '/init-linter',
    );
    const response = await post(
      JSON.stringify({
        filePath: 'dir/file.js',
        fileContent: 'if (true) 42; else 42;',
        fileType: 'MAIN',
      }),
      '/analyze-js',
    );
    const parsedResponse = JSON.parse(response);
    delete parsedResponse.perf;
    expect(parsedResponse).toEqual(expectedResponse);
  });

  it('should respond to TypeScript analysis request', async () => {
    const filePath = join(__dirname, './fixtures/ts-project/sample.lint.ts');
    const tsConfig = join(__dirname, './fixtures/ts-project/tsconfig.json');

    expect.assertions(2);
    expect(server.listening).toEqual(true);

    await post(
      JSON.stringify({
        rules: [{ key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: 'MAIN' }],
      }),
      '/init-linter',
    );
    const response = await post(
      JSON.stringify({
        filePath,
        fileContent: 'if (true) 42; else 42;',
        ignoreHeaderComments: true,
        tsConfigs: [tsConfig],
        fileType: 'MAIN',
      }),
      '/analyze-ts',
    );
    const parsedResponse = JSON.parse(response);
    delete parsedResponse.perf;
    expect(parsedResponse).toEqual(expectedResponse);
  }, 10_000);

  it('should respond OK! when started', done => {
    expect(server.listening).toEqual(true);
    const req = http.request(
      {
        host: 'localhost',
        port: (<AddressInfo>server.address()).port,
        path: '/status',
        method: 'GET',
      },
      res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          expect(data).toEqual('OK!');
          done();
        });
      },
    );
    req.end();
  });

  it('should unload ts module', async () => {
    const response = await post('', '/new-tsconfig');
    expect(response).toEqual('OK!');
    // note there is no easy way to test that module was unloaded, because jest is modifying require calls for tests
    // see https://github.com/facebook/jest/issues/6725
  });

  it('should return list of files for tsconfig', async () => {
    const tsconfig = join(__dirname, './fixtures/ts-project/tsconfig.json');
    const response = JSON.parse(await post(JSON.stringify({ tsconfig }), '/tsconfig-files')) as {
      files: string[];
    };
    expect(response.files).toHaveLength(2);
    expect(response.files[0].endsWith('sample.error.lint.ts')).toBeTruthy();
    expect(response.files[1].endsWith('sample.lint.ts')).toBeTruthy();
  });

  it('should return empty list of files for invalid tsconfig', async () => {
    const tsconfig = join(__dirname, './fixtures/invalid-tsconfig.json');
    const response = JSON.parse(await post(JSON.stringify({ tsconfig }), '/tsconfig-files'));
    expect(response.error).toBeDefined();
    expect(response.files).toBeUndefined();
  });

  it('should return empty list of files for invalid request', async () => {
    const tsconfig = join(__dirname, './fixtures/tsconfig.json');
    const response = JSON.parse(
      await post(JSON.stringify({ tsconfig42: tsconfig }), '/tsconfig-files'),
    );
    expect(response.error.startsWith('Debug Failure')).toBeTruthy();
  });

  function post(data, endpoint) {
    return postToServer(data, endpoint, server);
  }
});

describe('support custom rules', () => {
  it('should load custom rule bundles', async () => {
    const server: http.Server = await start(0, '127.0.0.1', ['custom-rule-bundle']);
    expect.assertions(2);
    expect(server.listening).toEqual(true);

    await postToServer(
      JSON.stringify({
        rules: [{ key: 'customrule', configurations: [], fileTypeTarget: 'MAIN' }],
      }),
      '/init-linter',
      server,
    );
    const response = await postToServer(
      JSON.stringify({
        filePath: 'dir/file.js',
        fileContent: 'foo()',
        fileType: 'MAIN',
      }),
      '/analyze-js',
      server,
    );

    expect(JSON.parse(response).issues).toEqual([
      {
        column: 0,
        endColumn: 3,
        endLine: 1,
        line: 1,
        message: 'call',
        ruleId: 'customrule',
        secondaryLocations: [],
      },
    ]);
  });
});

describe('server close', () => {
  it('should stop listening when closed', async () => {
    const server = await start();
    expect(server.listening).toBeTruthy();
    await postToServer('', '/close', server);
    expect(server.listening).toBeFalsy();
  });
});

describe('should send error when failing', () => {
  const failAnalysis = () => {
    throw new Error('general error');
  };
  let server: http.Server;
  let close;

  beforeEach(async () => {
    server = await startServer(failAnalysis, failAnalysis, failAnalysis);
    close = promisify(server.close.bind(server));
  });

  afterEach(async () => {
    await close();
  });

  it('should not fail JS analysis', async () => {
    const response = await postToServer(
      JSON.stringify({
        filePath: 'dir/file.js',
        fileContent: 'if (true) 42; else 42;',
        rules: [{ key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: 'MAIN' }],
        fileType: 'MAIN',
      }),
      '/analyze-js',
      server,
    );
    expect(JSON.parse(response).parsingError.message).toEqual('general error');
    expect(JSON.parse(response).parsingError.code).toEqual('GENERAL_ERROR');
  });

  it('should not fail TS analysis', async () => {
    const response = await postToServer(
      JSON.stringify({
        filePath: 'dir/file.js',
        fileContent: 'if (true) 42; else 42;',
        rules: [{ key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: 'MAIN' }],
        fileType: 'MAIN',
      }),
      '/analyze-ts',
      server,
    );
    expect(JSON.parse(response).parsingError.message).toEqual('general error');
    expect(JSON.parse(response).parsingError.code).toEqual('GENERAL_ERROR');
  });
});

describe('sonarlint context', () => {
  const expectedInSonarLint = {
    issues: expectedResponse.issues,
    metrics: {
      nosonarLines: [2],
    },
  };
  let server: http.Server;
  let close;

  beforeEach(async () => {
    server = await start();
    close = promisify(server.close.bind(server));
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: true,
    });
  });

  afterEach(async () => {
    await close();
  });

  it('should respond to JavaScript analysis request', async () => {
    expect.assertions(2);
    expect(server.listening).toEqual(true);

    await post(
      JSON.stringify({
        rules: [{ key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: 'MAIN' }],
      }),
      '/init-linter',
    );
    const response = await post(
      JSON.stringify({
        filePath: 'dir/file.js',
        fileContent: `if (true) 42; else 42;
        foo(); // NOSONAR 
        `,
        fileType: 'MAIN',
      }),
      '/analyze-js',
    );
    const parsedResponse = JSON.parse(response);
    delete parsedResponse.perf;
    expect(parsedResponse).toEqual(expectedInSonarLint);
  });

  describe('css analysis endpoint', () => {
    const stylelintConfig = join(__dirname, 'fixtures', 'css', 'stylelintconfig.json');

    it('should respond to analysis request for css', async () => {
      const request = JSON.stringify({
        filePath: join(__dirname, 'fixtures', 'css', 'file.css'),
        stylelintConfig,
      });
      const response = await post(request, '/analyze-css');
      expect(JSON.parse(response)).toEqual({
        issues: [
          {
            column: 3,
            line: 1,
            ruleId: 'block-no-empty',
            message: 'Unexpected empty block (block-no-empty)',
            secondaryLocations: [],
          },
        ],
      });
    });

    it('should respond to analysis request for php', async () => {
      const requestPhp = JSON.stringify({
        filePath: join(__dirname, 'fixtures', 'css', 'file.php'),
        stylelintConfig,
      });
      const responsePhp = await post(requestPhp, '/analyze-css');
      expect(JSON.parse(responsePhp)).toEqual({
        issues: [
          {
            column: 5,
            line: 7,
            ruleId: 'block-no-empty',
            message: 'Unexpected empty block (block-no-empty)',
            secondaryLocations: [],
          },
        ],
      });
    });

    it('should respond to analysis request for html', async () => {
      const requestHtml = JSON.stringify({
        filePath: join(__dirname, 'fixtures', 'css', 'file.html'),
        stylelintConfig,
      });
      const responseHtml = await post(requestHtml, '/analyze-css');
      expect(JSON.parse(responseHtml)).toEqual({
        issues: [
          {
            column: 3,
            line: 6,
            ruleId: 'block-no-empty',
            message: 'Unexpected empty block (block-no-empty)',
            secondaryLocations: [],
          },
        ],
      });
    });

    it('should cut BOM', async () => {
      const response = await post(
        JSON.stringify({
          filePath: join(__dirname, 'fixtures', 'css', 'file-bom.css'),
          stylelintConfig,
        }),
        '/analyze-css',
      );
      expect(JSON.parse(response)).toEqual({
        issues: [
          {
            column: 3,
            line: 1,
            ruleId: 'block-no-empty',
            message: 'Unexpected empty block (block-no-empty)',
            secondaryLocations: [],
          },
        ],
      });
    });

    it('should respond OK! when started', done => {
      const req = http.request(
        {
          host: 'localhost',
          port: (<AddressInfo>server.address()).port,
          path: '/status',
          method: 'GET',
        },
        res => {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            expect(data).toEqual('OK!');
            done();
          });
        },
      );
      req.end();
    });

    it('should use fileContent from the request and not from the filesystem', async () => {
      const request = JSON.stringify({
        filePath: join(__dirname, 'fixtures', 'css', 'file.css'),
        fileContent: '\n\n a { }', // move the issue on line 3
        stylelintConfig,
      });
      const response = await post(request, '/analyze-css');
      expect(JSON.parse(response)).toEqual({
        issues: [
          {
            column: 4,
            line: 3,
            ruleId: 'block-no-empty',
            message: 'Unexpected empty block (block-no-empty)',
            secondaryLocations: [],
          },
        ],
      });
    });
  });

  function post(data, endpoint) {
    return postToServer(data, endpoint, server);
  }
});

function postToServer(data, endpoint, server: http.Server): Promise<string> {
  const options = {
    host: 'localhost',
    port: (<AddressInfo>server.address()).port,
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    let response = '';

    const req = http.request(options, res => {
      res.on('data', chunk => {
        response += chunk;
      });

      res.on('end', () => resolve(response));
    });

    req.on('error', reject);

    req.write(data);
    req.end();
  });
}
