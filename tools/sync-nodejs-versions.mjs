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
import fs from 'fs/promises';
import semver from 'semver';
import path from 'node:path/posix';

const dirs = process.argv[2]
  ? [process.argv[2]]
  : ['sonar-plugin/bridge', 'sonar-plugin/sonar-javascript-plugin'];

// 1. Read package.json and extract the minimum Node.js version
const pkgRaw = await fs.readFile('package.json', 'utf8');
const pkg = JSON.parse(pkgRaw);
const range = pkg.engines.node;
const rangeSantized = range
  .split(' || ')
  .map(part => semver.minVersion(part))
  .join(',');
const minVersion = semver.minVersion(range).version;

for (const dir of dirs) {
  const resourcesDir = path.resolve(path.join(dir, 'src', 'main', 'resources'));
  const propertiesFile =
    dir === 'sonar-plugin/bridge'
      ? path.join(
          resourcesDir,
          'org',
          'sonar',
          'plugins',
          'javascript',
          'bridge',
          'node-info.properties',
        )
      : path.join(resourcesDir, 'node-info.properties');
  const propertiesContent =
    dir === 'sonar-plugin/bridge'
      ? `# This file is auto-generated from package.json\n` +
        `node.supported.versions=${rangeSantized}\n`
      : `# This file is auto-generated from package.json\n` + `node.min.version=${minVersion}\n`;
  await fs.mkdir(path.dirname(propertiesFile), { recursive: true });
  await fs.writeFile(propertiesFile, propertiesContent, 'utf8');
  console.log(
    `${path.relative(resourcesDir, propertiesFile)} for ${dir} updated with versions=${range}`,
  );
}
