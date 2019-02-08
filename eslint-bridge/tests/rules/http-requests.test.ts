import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/http-requests";

ruleTester.run("Sending HTTP requests is security-sensitive: client side", rule, {
  valid: [
    // no call to XMLHttpRequest constructor
    {
      code: `xmlhttp.open("GET", url, false);`,
    },
    {
      code: `myFetch()`,
    },
  ],
  invalid: [
    {
      code: `window.fetch(url);`,
      errors: [
        {
          message: "Make sure that this http request is sent safely.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 13,
        },
      ],
    },
    {
      code: `fetch(url);`,
      errors: 1,
    },
    {
      code: `
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", url, false);
        `,
      errors: 1,
    },
    {
      code: `
        var xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        xmlhttp.open("GET", url, false);
        `,
      errors: 1,
    },
    {
      code: `
        var xdr = new XDomainRequest();
        xdr.open("GET", url);
        `,
      errors: 1,
    },
    {
      code: `
        $.ajax({ url: url });
        $.get(url, function(data) {});
        `,
      errors: 2,
    },
  ],
});

ruleTester.run("Sending HTTP requests is security-sensitive: server side", rule, {
  valid: [
    // no import of http library
    {
      code: `http.request(url, (res) => {});`,
    },
    {
      code: `
      import { request } from "myModule";
      request(url, (res) => {});`,
    },
  ],
  invalid: [
    {
      code: `
        import { request } from 'http';
        request(url, (res) => {});
        `,
      errors: [
        {
          message: "Make sure that this http request is sent safely.",
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
        const http = require('http');
        http.request(url, (res) => {});
        http.get(url, (res) => {});
        `,
      errors: 2,
    },
    {
      code: `
      const request = require('request');
      request(url, function (error, res, body) {});
      `,
      errors: 1,
    },
    {
      code: `
      const axios = require('axios');
      axios.post(url);
      `,
      errors: 1,
    },
  ],
});
