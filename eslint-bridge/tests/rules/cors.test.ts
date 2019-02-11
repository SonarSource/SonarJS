import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/cors";

ruleTester.run("Enabling Cross-Origin Resource Sharing is security-sensitive", rule, {
  valid: [
    {
      code: `import * as express from 'foo'; app.use(cors());`,
    },
    {
      code: `import * as express from 'express'; app.use(bodyParser());`,
    },
    {
      code: `res.writeHead(200, { 'Content-Type': 'text/html' });`,
    },
  ],
  invalid: [
    {
      code: `res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });`,
      errors: [
        {
          message: "Make sure that enabling CORS is safe here.",
          line: 1,
          endLine: 1,
          column: 22,
          endColumn: 51,
        },
      ],
    },
    {
      code: `
        import * as express from 'express';
        import * as cors from 'cors';
        app.use(cors());`,
      errors: [
        {
          message: "Make sure that enabling CORS is safe here.",
          line: 4,
          endLine: 4,
          column: 17,
          endColumn: 23,
        },
      ],
    },

    {
      code: `
        const express = require('express');
        const cors = require('cors');
        res.header('Access-Control-Allow-Origin', 'http://localhost');
        //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        res.set('Access-Control-Max-Age', '86500');
        //      ^^^^^^^^^^^^^^^^^^^^^^^^
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        res.append('Access-Control-Allow-Credentials', 'true');
        //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`,
      errors: 4,
    },
    {
      code: `
        const express = require('express');
        const cors = require('cors');
        app.use(cors());`,
      errors: 1,
    },
  ],
});
