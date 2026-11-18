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
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync } from 'node:fs';

// The caller's requested tool subset and version overrides are part of the cache identity.
const overrides = Object.entries(process.env)
  .filter(([key]) => /^MISE_.*_VERSION$/.test(key) || key === 'MISE_ENV')
  .sort(([a], [b]) => a.localeCompare(b));
const key = createHash('sha256')
  .update(JSON.stringify([
    process.env.MISE_VERSION_INPUT,
    process.env.MISE_INSTALL_INPUT,
    process.env.MISE_CONFIG_HASH,
    overrides,
    existsSync('/etc/alpine-release') ? 'musl' : 'native',
    Math.floor(Date.now() / (30 * 86400000)),
  ]))
  .digest('hex');
appendFileSync(process.env.GITHUB_OUTPUT, `key=${key}\n`);
