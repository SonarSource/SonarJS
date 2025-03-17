/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { join, resolve } from 'node:path';
import { listRulesDir } from './helpers.js';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const sourceFolder = resolve('resources/rule-data');

const RULE_DATA_FOLDER = join(
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
);

const ruleNames = await listRulesDir();

ruleNames.push('S2260');

rmSync(RULE_DATA_FOLDER, {
  recursive: true,
  force: true,
});

mkdirSync(RULE_DATA_FOLDER, {
  recursive: true,
});

const sonarWayRuleNames: Array<string> = [];

for (const ruleName of ruleNames) {
  for (const extension of ['json', 'html']) {
    const fileName = `${ruleName}.${extension}`;

    copyFileSync(join(sourceFolder, fileName), join(RULE_DATA_FOLDER, fileName));
  }

  const manifestFileName = join(sourceFolder, `${ruleName}.json`);

  const manifest: {
    defaultQualityProfiles: Array<string>;
  } = JSON.parse(readFileSync(manifestFileName, 'utf-8'));

  const qualityProfileName = manifest.defaultQualityProfiles[0];

  if (qualityProfileName === 'Sonar way') {
    sonarWayRuleNames.push(ruleName);
  }
}

writeFileSync(
  join(RULE_DATA_FOLDER, 'Sonar_way_profile.json'),
  JSON.stringify({
    name: 'Sonar way',
    ruleKeys: sonarWayRuleNames,
  }),
);
