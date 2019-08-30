import { start } from "../src/server";
import * as http from "http";
import { Server } from "http";
import { promisify } from "util";
import { join } from "path";

const expectedResponse = {
  issues: [
    {
      column: 0,
      endColumn: 22,
      endLine: 1,
      line: 1,
      message:
        "Remove this conditional structure or edit its code blocks so that they're not all the same.",
      ruleId: "no-all-duplicated-branches",
      secondaryLocations: [],
    },
  ],
  highlights: [
    {
      startLine: 1,
      startCol: 0,
      endLine: 1,
      endCol: 2,
      textType: "KEYWORD",
    },
    {
      startLine: 1,
      startCol: 10,
      endLine: 1,
      endCol: 12,
      textType: "CONSTANT",
    },
    {
      startLine: 1,
      startCol: 14,
      endLine: 1,
      endCol: 18,
      textType: "KEYWORD",
    },
    {
      startLine: 1,
      startCol: 19,
      endLine: 1,
      endCol: 21,
      textType: "CONSTANT",
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
  },
  cpdTokens: [
    {
      startLine: 1,
      startCol: 0,
      endLine: 1,
      endCol: 2,
      image: "if",
    },
    {
      startLine: 1,
      startCol: 3,
      endLine: 1,
      endCol: 4,
      image: "(",
    },
    {
      startLine: 1,
      startCol: 4,
      endLine: 1,
      endCol: 8,
      image: "true",
    },
    {
      startLine: 1,
      startCol: 8,
      endLine: 1,
      endCol: 9,
      image: ")",
    },
    {
      startLine: 1,
      startCol: 10,
      endLine: 1,
      endCol: 12,
      image: "42",
    },
    {
      startLine: 1,
      startCol: 12,
      endLine: 1,
      endCol: 13,
      image: ";",
    },
    {
      startLine: 1,
      startCol: 14,
      endLine: 1,
      endCol: 18,
      image: "else",
    },
    {
      startLine: 1,
      startCol: 19,
      endLine: 1,
      endCol: 21,
      image: "42",
    },
    {
      startLine: 1,
      startCol: 21,
      endLine: 1,
      endCol: 22,
      image: ";",
    },
  ],
};

describe("server", () => {
  let server: Server;
  let close;

  beforeEach(async () => {
    server = await start();
    close = promisify(server.close.bind(server));
  });

  afterEach(async () => {
    await close();
  });

  it("should respond to JavaScript analysis request", async () => {
    expect.assertions(2);
    expect(server.listening).toEqual(true);

    const response = await post(
      JSON.stringify({
        filePath: "dir/file.js",
        fileContent: "if (true) 42; else 42;",
        rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
      }),
      "/analyze-js",
    );

    expect(JSON.parse(response)).toEqual(expectedResponse);
  });

  it("should respond to TypeScript analysis request", async () => {
    const filePath = join(__dirname, "./fixtures/ts-project/sample.lint.ts");
    const tsConfig = join(__dirname, "./fixtures/ts-project/tsconfig.json");

    expect.assertions(2);
    expect(server.listening).toEqual(true);

    const response = await post(
      JSON.stringify({
        filePath,
        fileContent: "if (true) 42; else 42;",
        rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
        tsConfigs: [tsConfig],
      }),
      "/analyze-ts",
    );

    expect(JSON.parse(response)).toEqual(expectedResponse);
  });

  it("should respond OK! when started", done => {
    expect(server.listening).toEqual(true);
    const req = http.request(
      {
        host: "localhost",
        port: server.address().port,
        path: "/status",
        method: "GET",
      },
      res => {
        let data = "";
        res.on("data", chunk => {
          data += chunk;
        });
        res.on("end", () => {
          expect(data).toEqual("OK!");
          done();
        });
      },
    );
    req.end();
  });

  function post(data, endpoint): Promise<string> {
    const options = {
      host: "localhost",
      port: server.address().port,
      path: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };

    return new Promise((resolve, reject) => {
      let response = "";

      const req = http.request(options, res => {
        res.on("data", chunk => {
          response += chunk;
        });

        res.on("end", () => resolve(response));
      });

      req.on("error", reject);

      req.write(data);
      req.end();
    });
  }
});
