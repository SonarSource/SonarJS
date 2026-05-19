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
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const skipRuleDataGeneration = process.env.SONARJS_SKIP_RULE_DATA_GENERATION === 'true';
const ruleDataDirectories = [
  join(
    'sonar-plugin',
    'javascript-checks',
    'src',
    'main',
    'resources',
    'org',
    'sonar',
    'l10n',
    'javascript',
    'rules',
    'javascript',
  ),
  join(
    'sonar-plugin',
    'css',
    'src',
    'main',
    'resources',
    'org',
    'sonar',
    'l10n',
    'css',
    'rules',
    'css',
  ),
];

if (skipRuleDataGeneration) {
  const missingRuleDataDirectories = ruleDataDirectories.filter(
    directory => !existsSync(directory),
  );
  if (missingRuleDataDirectories.length > 0) {
    console.error(
      `SONARJS_SKIP_RULE_DATA_GENERATION=true requires prepared rule data. Missing: ${missingRuleDataDirectories.join(', ')}`,
    );
    process.exit(1);
  }
}

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const scripts = skipRuleDataGeneration
  ? ['generate-meta:raw']
  : ['generate-rule-data:maven', 'generate-meta:raw'];

for (const script of scripts) {
  const result = spawnSync(npmExecutable, ['run', script], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
