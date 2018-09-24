import { start } from "../src/server";

describe("#start", () => {
  it("should start server", async () => {
    const server = await start(3000);
    console.log(server.listening);
    server.close();
  });
});
