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
import * as fs from 'node:fs';
import * as path from 'node:path';

const SONARLINT_METADATA_PATH = path.join(__dirname, 'sonarlint-metadata.json');
const ESLINT_TO_SONAR_ID_PATH = path.join(__dirname, '..', 'data', 'eslint-to-sonar-id.json');
const RULES_PATH = path.join(__dirname, '..', 'data', 'rules.json');

const rulesMetadata: RuleMetadata[] = JSON.parse(fs.readFileSync(SONARLINT_METADATA_PATH, 'utf8'));

type RuleMetadata = {
  ruleKey: string;
  eslintKey: string;
  scope: string;
  defaultParams: { [key: string]: unknown }[];
};
type RuleData = {
  key: string;
  fileTypeTarget: string[];
  configurations: { [key: string]: unknown }[];
  language: 'js' | 'ts';
};

extractKeysMapping();
extractRulesData();

function extractRulesData() {
  const rulesData: RuleData[] = [];
  rulesMetadata.forEach(ruleData => {
    const { eslintKey, scope, defaultParams, ruleKey } = ruleData;
    if (ruleKey.startsWith('css')) return;
    if (!eslintKey) return;
    const rule = applyRulingConfig({
      key: eslintKey,
      fileTypeTarget: parseType(scope),
      configurations: defaultParams,
      language: parseLanguage(ruleKey),
    });
    rulesData.push(rule);
  });

  function parseType(scope: string) {
    if (scope === 'ALL') {
      return ['MAIN'];
    } else {
      return [scope];
    }
  }
  function parseLanguage(ruleKey: string) {
    if (ruleKey.startsWith('typescript:')) {
      return 'ts';
    } else {
      return 'js';
    }
  }

  fs.writeFileSync(RULES_PATH, JSON.stringify(rulesData, null, 2));
}

function applyRulingConfig(rule: RuleData) {
  switch (rule.key) {
    case 'no-ignored-exceptions': {
      // for some reason the scope is different
      rule.fileTypeTarget = ['TEST'];
      break;
    }
    case 'no-exclusive-tests': {
      // for some reason the scope is different
      rule.fileTypeTarget = ['TEST'];
      break;
    }
    case 'file-header': {
      if (rule.language === 'js') {
        rule.configurations[0].headerFormat =
          '// Copyright 20\\d\\d The Closure Library Authors. All Rights Reserved.';
        rule.configurations[0].isRegularExpression = true;
      } else {
        rule.configurations[0].headerFormat = '//.*';
        rule.configurations[0].isRegularExpression = true;
      }
      break;
    }
    case 'comment-regex': {
      rule.configurations[0].regularExpression = '.*TODO.*';
      rule.configurations[0].flags = 'i';
      break;
    }
    case 'no-duplicate-string': {
      if (rule.language === 'js') {
        rule.configurations[0]!.threshold = 4;
      }
      break;
    }
  }
  return rule;
}

function extractKeysMapping() {
  const eslintToSonar: Record<string, string> = {};

  for (const rule of rulesMetadata) {
    eslintToSonar[rule.eslintKey] = extractSonarId(rule);
  }

  function extractSonarId(rule: { ruleKey: string }) {
    return rule.ruleKey.split(':')[1];
  }

  fs.writeFileSync(ESLINT_TO_SONAR_ID_PATH, JSON.stringify(eslintToSonar, null, 2));
}
