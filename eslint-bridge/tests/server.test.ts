import { start } from "../src/server";
import * as http from "http";
import { promisify } from "util";

describe("server", () => {
  let server;
  let close;

  beforeEach(async () => {
    server = await start();
    close = promisify(server.close.bind(server));
  });

  afterEach(async () => {
    await close();
  });

  it("should respond with issues", async () => {
    expect.assertions(2);
    expect(server.listening).toEqual(true);

    const response = await post(
      JSON.stringify({
        filepath: "dir/file.js",
        fileContent: "if (true) 42; else 42;",
        rules: [{ key: "no-all-duplicated-branches", configurations: [] }],
      }),
    );

    expect(JSON.parse(response)).toEqual([
      {
        column: 1,
        endColumn: 23,
        endLine: 1,
        line: 1,
        message:
          "Remove this conditional structure or edit its code blocks so that they're not all the same.",
        ruleId: "no-all-duplicated-branches",
      },
    ]);
  });

  function post(data): Promise<string> {
    const options = {
      host: "localhost",
      port: server.address().port,
      path: "/analyze",
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
