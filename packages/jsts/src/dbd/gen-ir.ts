import path from 'path';
import { Linter } from 'eslint';
import { rule } from '../rules/S99999';
import { readFile } from '@sonar/shared';
import { buildSourceCode } from '@sonar/jsts';
import * as process from 'node:process';
import fs from 'fs/promises';

const linter = new Linter();
linter.defineRule('dbd-rule', rule);

const [dirPath] = process.argv.length > 2 ? process.argv.slice(2) : [];

fs.stat(dirPath)
  .then(stats => {
    if (stats.isDirectory()) {
      return generateDirIR(dirPath);
    }
    if (stats.isFile()) {
      return generateIR(dirPath);
    }
  })
  .catch(err => {
    console.log(`ERROR while generating IRs: ${err}`);
  });

export async function generateDirIR(dirPath: string) {
  for (const file of await fs.readdir(dirPath, { withFileTypes: true })) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      await generateDirIR(filePath);
    } else {
      await generateIR(file.path);
    }
  }
}

export async function generateIR(filePath: string) {
  const fileContent = await readFile(filePath);
  const sourceCode = buildSourceCode(
    { fileContent, filePath, tsConfigs: [], fileType: 'MAIN' },
    'js',
  );
  linter.verify(
    sourceCode,
    { rules: { 'dbd-rule': 'error' }, settings: { dbd: { IRPath: path.dirname(filePath) } } },
    { filename: filePath, allowInlineConfig: false },
  );
}
