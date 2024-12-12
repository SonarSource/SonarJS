import { listRulesDir, RULES_FOLDER, writePrettyFile } from './helpers.js';
import { readdir } from 'fs/promises';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

const rules = await listRulesDir();
const UNIT_TEST = 'unit.test.ts';

let count = 0;
for (const rule of rules) {
  const ruleFolder = join(RULES_FOLDER, rule);
  const files = await readdir(ruleFolder);
  if (!files.includes(UNIT_TEST)) {
    continue;
  }
  const testContents = await readFile(join(ruleFolder, UNIT_TEST), 'utf8');
  if (testContents.match(/import\s*\{\s*[^}]*\s*}\s+from\s+'node:test'/)) {
    console.log('DONEEEEE!!');
    count++;
    continue;
  }
  const lines = testContents.split('\n');
  const lastImport = lines.findLastIndex(line => line.startsWith('import {'));
  lines.splice(
    lastImport + 1,
    0,
    `import { describe } from 'node:test';`,
    '',
    `describe('${rule}', () => {`,
  );
  lines.push('});');
  await writePrettyFile(join(ruleFolder, UNIT_TEST), lines.join('\n'));
  //console.log(ruleFolder);
}

console.log(count, rules.length);
