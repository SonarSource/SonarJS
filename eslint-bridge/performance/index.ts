/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import * as http from 'http';
import path from 'path';
import { request } from '../tests/tools';

const server = {
  address: () => { return { port: 64829 }}
};

(async () => {
  const fileType = 'MAIN';
  await requestInitLinter(server as http.Server, fileType, 'no-commented-code');
  const filePath = path.join(__dirname, 'file.js');
  const data = { filePath, fileType, tsConfigs: [], linterId: 'default' };
  const response = (await request(server as http.Server, '/analyze-js', 'POST', data)) as string;
  const body = JSON.parse(response);
  console.log('got', body);
})();

function requestInitLinter(server: http.Server, fileType: string, ruleId: string) {
  const config = {
    rules: [{ key: ruleId, configurations: [], fileTypeTarget: fileType }],
  };

  return request(server, '/init-linter', 'POST', config);
}
