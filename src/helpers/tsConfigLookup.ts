/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import fs from 'fs';
import path from 'path';
import { getContext, projectTSConfigs } from './context';
import { readFileSync, toUnixPath } from './files';
import * as console from 'console';

export default function tsConfigLookup(dir?: string) {
  if (!dir) {
    dir = getContext().workDir;
  }
  if (!fs.existsSync(dir)) {
    console.log(`ERROR Could not access working directory ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filename = path.posix.join(dir, file);
    const stats = fs.lstatSync(filename);
    if (file === 'node_modules' && stats.isDirectory()) {
      tsConfigLookup(filename);
    } else if (filename.match(/[tj]sconfig.*\.json/)) {
      const contents = fs.readFileSync(filename, 'utf-8');
      projectTSConfigs.set(filename, {
        filename,
        contents,
      });
    }
  }
}

export function updateTsConfigs(tsconfigs: string[]) {
  for (const tsconfig of tsconfigs) {
    const normalizedTsConfig = toUnixPath(tsconfig);
    try {
      const contents = readFileSync(normalizedTsConfig);
      const existingTsConfig = projectTSConfigs.get(tsconfig);
      if (existingTsConfig && existingTsConfig.contents !== contents) {
        existingTsConfig.contents = contents;
        existingTsConfig.reset = true;
      } else {
        projectTSConfigs.set(normalizedTsConfig, {
          filename: normalizedTsConfig,
          contents,
        });
      }
    } catch (e) {
      console.log(`ERROR: Could not read tsconfig ${tsconfig}`);
    }
  }
}
