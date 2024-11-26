/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
