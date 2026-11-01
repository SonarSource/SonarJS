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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import selectProvider from '../packages/typescript/selection.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
/** Prepare provider resources without importing its runtime before they exist. */
export function prepareCompiler(all = false) {
  const provider = selectProvider();
  if (provider.prepare)
    execFileSync(
      process.execPath,
      [path.resolve(root, provider.prepare), ...(all ? ['--all'] : [])],
      {
        cwd: root,
        stdio: 'inherit',
      },
    );
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  prepareCompiler(process.argv.includes('--all'));
