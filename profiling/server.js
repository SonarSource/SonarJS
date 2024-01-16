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
const server = require('../lib/server');
const path = require('path');
const context = require('../lib/helpers');
const { tmpdir } = require('os');

// must be the same as the one used in ./profile-rule.ts
const port = 64829;
const host = '127.0.0.1';
const workDir = tmpdir();

context.setContext({
  workDir,
  shouldUseTypeScriptParserForJS: false,
  sonarlint: false,
  bundles: [],
});
const BIG_TIMEOUT = 1719925474;
server.start(port, host, BIG_TIMEOUT);
