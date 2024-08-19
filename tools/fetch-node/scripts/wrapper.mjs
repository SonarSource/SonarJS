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
import * as fs from 'node:fs';
import * as url from 'node:url';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { getRuntimePaths, TARGET_DIR } from './directories.mjs';
// replace __dirname in module
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * Skips running the fetch node scripts if Node.js runtimes are already present
 */
const runtimePaths = getRuntimePaths();

if (runtimePaths.every(p => fs.existsSync(p.targetFilename))) {
  console.log(`Skipping. All Node.js runtimes are already present in the plugin: ${TARGET_DIR}`);
  console.log('If the runtimes are outdated, delete the folder and run the script again.');
  process.exit(0);
}

execSync(`node ${path.join(__dirname, 'fetch-node.mjs')}`, { stdio: 'inherit' });

execSync(`mvn -f ${path.join(__dirname, '..', 'pom.xml')} package exec:java`, { stdio: 'inherit' });

execSync(`node ${path.join(__dirname, 'copy-to-plugin.mjs')}`, { stdio: 'inherit' });
