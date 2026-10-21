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
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import metadata from 'typescript-go/package.json' with { type: 'json' };
import configuration from '../packages/typescript/providers.json' with { type: 'json' };
import lock from '../package-lock.json' with { type: 'json' };

const require = createRequire(import.meta.url);
export function prepareNativeAssets(all = false) {
  const platforms = all
    ? configuration.providers['tsgo-ipc'].platforms
    : [`${process.platform}-${process.arch}`];
  const directory = path.resolve(
    'packages/typescript',
    configuration.providers['tsgo-ipc'].libraries,
  );
  fs.mkdirSync(directory, { recursive: true });
  const prepared = { version: metadata.version, platforms: [] };
  for (const platform of platforms) {
    const packageName = `@typescript/${metadata.name}-${platform}`;
    const pinned = lock.packages[`node_modules/${packageName}`];
    if (
      !pinned ||
      pinned.version !== metadata.version ||
      metadata.optionalDependencies[packageName] !== metadata.version
    )
      throw new Error(`Unpinned native compiler package: ${packageName}`);
    const executable = path.join(
      directory,
      `tsc-${platform}${platform.startsWith('win32-') ? '.exe' : ''}`,
    );
    const marker = path.join(directory, `${platform}.json`);
    if (
      fs.existsSync(executable) &&
      fs.existsSync(marker) &&
      JSON.parse(fs.readFileSync(marker)).integrity === pinned.integrity
    ) {
      prepared.platforms.push(platform);
      continue;
    }
    let manifest;
    try {
      manifest = require.resolve(`${packageName}/package.json`);
    } catch {
      const staging = path.resolve(directory, '../downloads', platform);
      fs.mkdirSync(staging, { recursive: true });
      // npm honors the configured registry and authentication. Verify its tarball
      // against the lock before extracting any executable, including off-host ones.
      const packed = JSON.parse(
        execFileSync(
          'npm',
          [
            'pack',
            `${packageName}@${pinned.version}`,
            '--ignore-scripts',
            '--json',
            '--pack-destination',
            staging,
          ],
          { encoding: 'utf8', shell: process.platform === 'win32' },
        ),
      )[0];
      const archive = path.join(staging, packed.filename);
      const [algorithm, expected] = pinned.integrity.split('-');
      if (createHash(algorithm).update(fs.readFileSync(archive)).digest('base64') !== expected)
        throw new Error(`Native compiler integrity mismatch: ${packageName}`);
      execFileSync('tar', ['-xzf', archive, '-C', staging]);
      manifest = path.join(staging, 'package/package.json');
    }
    const installed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (installed.name !== packageName || installed.version !== metadata.version)
      throw new Error('Native compiler and API client versions must match');
    const originalDirectory = path.join(path.dirname(manifest), 'lib');
    fs.copyFileSync(
      path.join(originalDirectory, platform.startsWith('win32-') ? 'tsc.exe' : 'tsc'),
      executable,
    );
    fs.chmodSync(executable, 0o755);
    // The compiler looks for its standard libraries beside the executable.
    for (const name of fs.readdirSync(originalDirectory))
      if (name.endsWith('.d.ts'))
        fs.copyFileSync(path.join(originalDirectory, name), path.join(directory, name));
    for (const name of ['LICENSE', 'NOTICE.txt'])
      fs.copyFileSync(path.join(path.dirname(manifest), name), path.join(directory, name));
    fs.writeFileSync(
      marker,
      JSON.stringify({ version: metadata.version, integrity: pinned.integrity }) + '\n',
    );
    prepared.platforms.push(platform);
  }
  // A host-only preparation must still describe valid off-host assets left by
  // an earlier full bundle preparation.
  prepared.platforms = configuration.providers['tsgo-ipc'].platforms.filter(platform => {
    const marker = path.join(directory, `${platform}.json`);
    const executable = path.join(
      directory,
      `tsc-${platform}${platform.startsWith('win32-') ? '.exe' : ''}`,
    );
    return (
      fs.existsSync(executable) &&
      fs.existsSync(marker) &&
      JSON.parse(fs.readFileSync(marker)).version === metadata.version
    );
  });
  fs.writeFileSync(path.join(directory, 'version.json'), JSON.stringify(prepared, null, 2) + '\n');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  prepareNativeAssets(process.argv.includes('--all'));
