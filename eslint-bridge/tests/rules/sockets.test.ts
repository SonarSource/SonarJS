import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/sockets";

ruleTester.run("Handling files is security-sensitive", rule, {
  valid: [
    {
      code: `
        const net = require('net');
        net.createServer();
        `,
    },
    {
      code: `
         net.Socket();
        `,
    },
  ],
  invalid: [
    {
      code: `
        const net = require('net');
        net.Socket();
        `,
      errors: [
        {
          message: "Make sure that sockets are used safely here.",
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 19,
        },
      ],
    },
    {
      code: `
        const net = require('net');
        net.createConnection({ port: port }, () => {});`,
      errors: 1,
    },
    {
      code: `
        import { connect } from 'net'
        connect({ port: port }, () => {});;
      `,
      errors: 1,
    },
  ],
});
