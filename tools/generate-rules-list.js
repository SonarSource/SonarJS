import { rules } from '../lib/jsts/src/rules/index.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mkdirpSync } from 'mkdirp';

const targetDir = join(
  import.meta.url,
  '..',
  'sonar-plugin',
  'sonar-javascript-plugin',
  'target',
  'classes',
);

mkdirpSync(targetDir);
writeFileSync(join(targetDir, 'rules.json'), JSON.stringify(Object.keys(rules)));
