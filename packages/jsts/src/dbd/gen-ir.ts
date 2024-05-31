import fs from 'fs/promises';
import { program } from 'commander';
import { generateDirIR, generateIR } from './helpers';
import path from 'path';
import * as process from 'node:process';

program
  .option('-F, --file <file>', 'Path to directory or file to parse')
  .option('-S, --string <string...>', 'String to parse')
  .option('-P, --print', 'Print instead of saving to disk')
  .option('-O, --output <path>', 'Path to save output files');

const options = program.parse().opts();

Promise.resolve()
  .then(async () => {
    if (options.file) {
      const stats = await fs.stat(options.file);
      let root;
      if (stats.isDirectory()) {
        await generateDirIR(options.file, options.output, options.print, options.file);
        root = options.file;
      }
      if (stats.isFile()) {
        await generateIR(
          options.file,
          options.output,
          undefined,
          options.print,
          path.dirname(options.file),
        );
        root = path.dirname(options.file);
      }
      await generateIR(
        path.join(__dirname, 'js-to-dbd/builtin/builtin.js'),
        options.output,
        options.print,
        root,
      );
    }
    if (options.string) {
      let i = 0;
      for (const contents of options.string) {
        await generateIR(
          path.join(process.cwd(), `cli-snippet-${i++}.js`),
          options.output || process.cwd(),
          contents,
          options.print,
        );
      }
    }
  })
  .catch(err => {
    console.error(err);

    console.log(`ERROR while generating IRs: ${err}`);
  });
