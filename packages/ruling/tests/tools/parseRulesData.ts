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
import fs from 'node:fs';
import path from 'node:path';

const SONARLINT_METADATA_PATH = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'sonar-plugin',
  'sonar-javascript-plugin',
  'target',
  'classes',
  'sonarlint-metadata.json',
);
const RULES_PATH = path.join(import.meta.dirname, '..', 'data', 'rules.json');

// Loading this through `fs` and not import because the file is absent at compile time
const rulesMetadata: RuleMetadata[] = JSON.parse(fs.readFileSync(SONARLINT_METADATA_PATH, 'utf8'));

type RuleMetadata = {
  ruleKey: string;
  eslintKey: string;
  scope: string;
  defaultParams: { [key: string]: unknown }[];
};
type RuleData = {
  key: string;
  fileTypeTargets: string[];
  configurations: { [key: string]: unknown }[];
  language: 'js' | 'ts';
  analysisModes: 'DEFAULT'[];
};

extractRulesData();

function extractRulesData() {
  const rulesData: RuleData[] = [];
  rulesMetadata.forEach(ruleData => {
    const { eslintKey, scope, defaultParams, ruleKey } = ruleData;
    if (isInvalidRule(ruleKey, eslintKey)) {
      return;
    }
    const rule = applyRulingConfig({
      key: eslintKey,
      fileTypeTargets: parseType(scope),
      configurations: defaultParams,
      language: parseLanguage(ruleKey),
      analysisModes: ['DEFAULT'],
    });
    rulesData.push(rule);
  });
  fs.writeFileSync(RULES_PATH, JSON.stringify(rulesData, null, 2));
}

function isInvalidRule(ruleKey: string, eslintKey?: string) {
  return ruleKey.startsWith('css') || !eslintKey;
}

/**
 * Apply the non-default configuration for some rules
 */
function applyRulingConfig(rule: RuleData) {
  switch (rule.key) {
    case 'S2486': {
      // for some reason the scope is different
      rule.fileTypeTargets = ['TEST'];
      break;
    }
    case 'S6426': {
      // for some reason the scope is different
      rule.fileTypeTargets = ['TEST'];
      break;
    }
    case 'S1451': {
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
    case 'S124': {
      rule.configurations[0].regularExpression = '.*TODO.*';
      rule.configurations[0].flags = 'i';
      break;
    }
    case 'S1192': {
      if (rule.language === 'js') {
        rule.configurations[0]!.threshold = 4;
      }
      break;
    }
  }
  return rule;
}

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
