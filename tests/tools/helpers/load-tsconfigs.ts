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
import { ProjectTSConfigs, readFile, toUnixPath, TSConfig } from 'helpers';
import path from 'path';
import { setDefaultTSConfigs } from 'services/program';

export async function loadTsconfigs(tsConfigs) {
  const projectTSConfigs = new ProjectTSConfigs();
  for (const tsConfigPath of tsConfigs) {
    const contents = JSON.parse(await readFile(tsConfigPath));
    if (!contents.include && !contents.files) {
      contents.include = [`${path.posix.dirname(toUnixPath(tsConfigPath))}/**/*`];
    }
    const tsconfig: TSConfig = {
      filename: toUnixPath(tsConfigPath),
      contents: JSON.stringify(contents),
    };
    projectTSConfigs.db.set(toUnixPath(tsConfigPath), tsconfig);
  }
  setDefaultTSConfigs(projectTSConfigs);
}
