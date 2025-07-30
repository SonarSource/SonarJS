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
import { join, resolve } from 'node:path/posix';
import { listRulesDir } from './helpers.js';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const sourceFolder = resolve('resources/rule-data');

const JS_RULE_DATA_FOLDER = join(
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

const CSS_RULE_DATA_FOLDER = join(
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
);

const jsRuleNames = [...(await listRulesDir()), 'S2260'];

const cssRuleNames = JSON.parse(
  readFileSync(join(CSS_RULE_DATA_FOLDER, '..', 'rules.json'), 'utf-8'),
);

syncRuleData(join(sourceFolder, 'javascript'), JS_RULE_DATA_FOLDER, jsRuleNames);
syncRuleData(join(sourceFolder, 'css'), CSS_RULE_DATA_FOLDER, cssRuleNames);

function syncRuleData(sourceFolder: string, targetFolder: string, ruleNames: string[]) {
  // rmSync(targetFolder, {
  //   recursive: true,
  //   force: true,
  // });
  //
  // mkdirSync(targetFolder, {
  //   recursive: true,
  // });

  const sonarWayRuleNames: Array<string> = [];

  for (const ruleName of ruleNames) {
    for (const extension of ['json', 'html']) {
      const fileName = `${ruleName}.${extension}`;

      if (existsSync(join(sourceFolder, fileName))) {
        copyFileSync(join(sourceFolder, fileName), join(targetFolder, fileName));
      }
    }
    if (existsSync(join(targetFolder, `${ruleName}.json`))) {
      const manifest: {
        defaultQualityProfiles: Array<string>;
      } = JSON.parse(readFileSync(join(targetFolder, `${ruleName}.json`), 'utf-8'));

      const qualityProfileName = manifest.defaultQualityProfiles[0];

      if (qualityProfileName === 'Sonar way') {
        sonarWayRuleNames.push(ruleName);
      }
    }
  }

  writeFileSync(
    join(targetFolder, 'Sonar_way_profile.json'),
    JSON.stringify({
      name: 'Sonar way',
      ruleKeys: sonarWayRuleNames,
    }),
  );
}
