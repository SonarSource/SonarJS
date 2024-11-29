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
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getAllRulesMetadata, RULES_FOLDER, writePrettyFile } from './helpers.js';

/**
 * Script to be called to update the eslint-plugin-sonarjs README.md
 * eslint-doc-generator will create a table in the README with all the rules contained in
 * plugin. However, we only package the 'original' implementation rules.
 *
 * We want the README to mention what other rules are contained in SonarJS but NOT
 * shipped in the ESlint plugin, so that the users can install those 3rd party plugins
 * and enable those rules to get an experience as close as SonarJS but using ESLint
 *
 * This script will fill the README with those rules for which their meta.ts file
 * exports implementation = ['external'|'decorated']
 */

const decoratedRules = [];
const externalRules = [];
(await getAllRulesMetadata()).forEach(metadata => {
  if (metadata.implementation === 'decorated') {
    decoratedRules.push({
      sonarId: metadata.sonarKey,
      rules: metadata.externalRules,
    });
  } else if (metadata.implementation === 'external') {
    externalRules.push({
      sonarId: metadata.sonarKey,
      externalPlugin: metadata.externalPlugin,
      externalRule: metadata.eslintId,
    });
  }
});

const externalContents = `| SonarJS rule ID | Rule implemented by |\n|:---|:---|\n${externalRules
  .map(
    rule =>
      `| ${sonarCell(rule.sonarId)} | ${externalRuleCell(rule.externalPlugin, rule.externalRule)} |\n`,
  )
  .join('')}`;

const decoratedContents = `| SonarJS rule ID | Rules used in the SonarJS implementation |\n|:---|:---|\n${decoratedRules
  .map(
    rule =>
      `| ${sonarCell(rule.sonarId)} | ${rule.rules.map(r => externalRuleCell(r.externalPlugin, r.externalRule)).join('<br>')} |\n`,
  )
  .join('')}`;

const README = join(RULES_FOLDER, 'README.md');

await writePrettyFile(
  README,
  (await readFile(README, 'utf8'))
    .replace(
      /<!--- start external rules -->.*<!--- end external rules -->/gs,
      `<!--- start external rules -->\n${externalContents}\n<!--- end external rules -->`,
    )
    .replace(
      /<!--- start decorated rules -->.*<!--- end decorated rules -->/gs,
      `<!--- start decorated rules -->\n${decoratedContents}\n<!--- end decorated rules -->`,
    ),
);

function sonarURL(key: string) {
  return `https://sonarsource.github.io/rspec/#/rspec/${key}/javascript`;
}

function sonarCell(key: string) {
  return `[${key}](${sonarURL(key)})`;
}

function externalURL(plugin: string, key: string) {
  switch (plugin) {
    case 'import':
      return `https://github.com/import-js/eslint-plugin-import/blob/HEAD/docs/rules/${key}.md`;
    case 'react':
      return `https://github.com/jsx-eslint/eslint-plugin-react/blob/HEAD/docs/rules/${key}.md`;
    case 'eslint':
      return `https://eslint.org/docs/latest/rules/${key}`;
    case 'jsx-a11y':
      return `https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/HEAD/docs/rules/${key}.md`;
    case 'typescript-eslint':
      return `https://github.com/typescript-eslint/typescript-eslint/blob/v7.18.0/packages/eslint-plugin/docs/rules/${key}.mdx`;
    case 'react-hooks':
      return 'https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/README.md';
    default:
      throw new Error(`Error generating URL for unknown ESLint plugin ${plugin}`);
  }
}

function externalRuleCell(plugin: string, key: string) {
  return `[${plugin}/${key}](${externalURL(plugin, key)})`;
}
