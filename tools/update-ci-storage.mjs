/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// GitHub requires literal action refs. This file generates them from one owned definition.
const root = fileURLToPath(new URL('../', import.meta.url));
const versions = JSON.parse(readFileSync(path.join(root, '.github/ci-storage.json'), 'utf8'));
const refs = new Map([
  ['SonarSource/gh-action_cache', versions.actionRef],
]);
for (const ref of refs.values()) {
  if (!/^[a-f0-9]{40}$/.test(ref)) throw new Error(`Expected an immutable action commit: ${ref}`);
}
function update(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) update(file);
    else if (/\.ya?ml$/.test(entry.name)) {
      const previous = readFileSync(file, 'utf8');
      let content = previous;
      for (const [action, ref] of refs) {
        content = content.replaceAll(new RegExp(`${action}@(?:[a-f0-9]{40}|S3_ACTION_SHA)`, 'g'), `${action}@${ref}`);
      }
      if (content !== previous) {
        if (process.argv.includes('--check')) throw new Error(`Regenerate action pins: ${file}`);
        writeFileSync(file, content);
      }
    }
  }
}
update(path.join(root, '.github'));
