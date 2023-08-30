/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

// install eslint plugins before running this script:
// npm i --no-save eslint-plugin-ember eslint-plugin-import eslint-plugin-jsx-a11y eslint-plugin-node eslint-plugin-vue @angular-eslint/eslint-plugin @angular-eslint/eslint-plugin-template

const MAX_RULE_NAME_LENGTH = 200;

const fs = require('fs');
const path = require('path');
const eslint = require('eslint');

const plugins = {
  '@angular-eslint': '@angular-eslint/eslint-plugin',
  '@angular-eslint/template': '@angular-eslint/eslint-plugin-template',
  '@typescript-eslint': '@typescript-eslint/eslint-plugin',
  ember: 'eslint-plugin-ember',
  import: 'eslint-plugin-import',
  'jsx-a11y': 'eslint-plugin-jsx-a11y',
  node: 'eslint-plugin-node',
  react: 'eslint-plugin-react',
  'react-hooks': 'eslint-plugin-react-hooks',
  sonarjs: 'eslint-plugin-sonarjs',
  vue: 'eslint-plugin-vue',
};

function saveMetadata(rules, pluginName) {
  const sanitizedName = pluginName.replace('/', '-');
  const filename = path.resolve(
    __dirname,
    `../sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/eslint/${sanitizedName}.json`,
  );
  fs.writeFileSync(filename, JSON.stringify(rules, null, 2), 'utf8');
}

Object.entries(plugins).forEach(([pluginName, npmModuleName]) => {
  console.log(`Processing ${npmModuleName}`);
  const plugin = require(npmModuleName);
  const rules = Object.entries(plugin.rules).map(([key, rule]) => {
    const ruleKey = `${pluginName}/${key}`;
    return {
      key: ruleKey,
      name: rule.meta.docs?.description?.slice(0, MAX_RULE_NAME_LENGTH),
      type: rule.meta.type === 'problem' ? 'BUG' : undefined,
      description: `See description of ESLint rule <code>${ruleKey}</code> at the <a href="${rule.meta.docs.url}">${npmModuleName} website</a>`,
    };
  });
  saveMetadata(rules, pluginName);
});

console.log(`Processing core eslint rules`);
const linter = new eslint.Linter();
const coreRules = Array.from(linter.getRules().entries()).map(([key, rule]) => {
  return {
    key,
    type: rule.meta.type === 'problem' ? 'BUG' : undefined,
    url: rule.meta.docs.url,
    name: rule.meta.docs.description,
  };
});
saveMetadata(coreRules, 'core');
console.log(`Done`);
