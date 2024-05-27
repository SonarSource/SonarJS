import fs from 'fs/promises';
import { program } from 'commander';
import { generateDirIR, generateIR } from './helpers';
import path from 'path';
import * as process from 'node:process';

program
  .option('-F, --file <file...>', 'Files to parse')
  .option('-S, --string <string...>', 'String to parse')
  .option('-R, --root <string>', 'Project root path')
  .option('-P, --print', 'Print instead of saving to disk')
  .option('-O, --output <path>', 'Path to save output files');

const options = program.parse().opts();

Promise.resolve()
  .then(async () => {
    if (options.file) {
      for await (const dirPath of options.file) {
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          await generateDirIR(dirPath, options.output, options.print, options.root);
        }
        if (stats.isFile()) {
          await generateIR(dirPath, options.output, undefined, options.print, options.root);
        }
      }
    }
    if (options.string) {
      let i = 0;
      for (const contents of options.string) {
        await generateIR(
          path.join(process.cwd(), `cli-snippet-${i++}.js`),
          options.output || process.cwd(),
          contents,
          options.print,
          options.root,
        );
      }
    }
  })
  .catch(err => {
    console.log(`ERROR while generating IRs: ${err}`);
  });
