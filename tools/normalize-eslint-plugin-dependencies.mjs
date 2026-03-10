/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2026 SonarSource Sarl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const exactSemver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function normalizeDependencies(dependencies) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => {
      if (typeof version === 'string' && exactSemver.test(version)) {
        return [name, `^${version}`];
      }
      return [name, version];
    }),
  );
}

const packageJsonPath = resolve(process.argv[2] ?? 'lib/package.json');
const packageJsonContent = (await readFile(packageJsonPath, 'utf8')).replace(/^\uFEFF/, '');
const packageJson = JSON.parse(packageJsonContent);

if (packageJson.dependencies) {
  packageJson.dependencies = normalizeDependencies(packageJson.dependencies);
}

await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
