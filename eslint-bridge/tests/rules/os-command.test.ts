import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/os-command";

ruleTester.run("Executing OS commands is security-sensitive", rule, {
  valid: [
    {
      code: `
        const cp = require('child_process');
        cp.fork('child.js');
        `,
    },
    {
      code: `
        import { fork } from 'child_process';
        fork('child.js');`,
    },
    {
      code: `
        const cp = require('child_process');
        cp.exec('echo child_process.exec hardcoded >> output.txt');`,
    },
    {
      code: `
        const cp = require('child_process');
        cp.spawn('echo child_process.exec hardcoded >> output.txt', { shell: true });`,
    },
    {
      code: `
        const cp = require('child_process');
        cp.spawn('echo child_process.spawn ' + userinput + ' >> output.txt', { shell: false });`,
    },
    {
      code: `
        const cp = require('child_process');
        cp.spawn('echo child_process.spawn ' + userinput + ' >> output.txt');`,
    },
    {
      code: `
      const exec = require('child_process').fork;
      exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
    },
  ],
  invalid: [
    {
      code: `
        const cp = require('child_process');
        cp.exec('echo child_process.exec ' + userInput + ' >> output.txt');
        `,
      errors: [
        {
          message: "Make sure that executing this OS command is safe here.",
          line: 3,
          endLine: 3,
          column: 12,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
        import * as cp from 'child_process';
        cp.exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
      errors: 1,
    },
    {
      code: `
        import { exec } from 'child_process';
        exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
      errors: 1,
    },
    {
      code: `
        import * as cp from 'child_process';
        cp.spawn('echo child_process.exec ' + process.argv[2] + ' >> output.txt', { shell: true });`,
      errors: 1,
    },
    {
      code: `
      import * as cp from 'child_process';
      cp.exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt', { env: "" });`,
      errors: 1,
    },
    {
      code: `
      const exec = require('child_process').exec;
      exec('echo child_process.exec ' + process.argv[2] + ' >> output.txt');`,
      errors: 1,
    },
    {
      code: `
      var execSync = require('child_process').execSync
      function exec(command) {
        execSync(command, { stdio: [0, 1, 2] })
      }
      `,
      errors: 1,
    },
  ],
});
