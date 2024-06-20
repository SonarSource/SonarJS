/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
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
      if (stats.isDirectory()) {
        await generateDirIR(options.file, undefined, options.output, options.print, options.root);
      }
      if (stats.isFile()) {
        await generateIR(
          options.file,
          undefined,
          options.output,
          undefined,
          options.print,
          options.root,
        );
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
        );
      }
    }
  })
  .catch(err => {
    console.error(err);

    console.log(`ERROR while generating IRs: ${err}`);
  });
