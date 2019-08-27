import { start } from "../src/server";
import * as http from "http";
import { Server } from "http";
import { promisify } from "util";
import { join } from "path";

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

    expect(JSON.parse(response)).toEqual({
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
    });
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

    expect(JSON.parse(response)).toEqual({
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
    });
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
