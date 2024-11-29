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
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readdir } from 'fs/promises';
import prettier from 'prettier';
import { prettier as prettierOpts } from '../package.json';

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

const sonarKeySorter = (a, b) =>
  parseInt(a.sonarId.substring(1)) < parseInt(b.sonarId.substring(1)) ? -1 : 1;

const ruleRegex = /^S\d+$/;
const RULES_FOLDER = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'packages',
  'jsts',
  'src',
  'rules',
);

const decoratedRules = [];
const externalRules = [];
const files = await readdir(RULES_FOLDER, { withFileTypes: true });
for (const file of files) {
  if (ruleRegex.test(file.name) && file.isDirectory()) {
    const metadata = await import(
      pathToFileURL(join(RULES_FOLDER, file.name, 'meta.js')).toString()
    );
    if (metadata.implementation === 'decorated') {
      decoratedRules.push({
        sonarId: file.name,
        rules: metadata.externalRules,
      });
    } else if (metadata.implementation === 'external') {
      externalRules.push({
        sonarId: file.name,
        externalPlugin: metadata.externalPlugin,
        externalRule: metadata.eslintId,
      });
    }
  }
}

externalRules.sort(sonarKeySorter);
decoratedRules.sort(sonarKeySorter);

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

const README = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'packages',
  'jsts',
  'src',
  'rules',
  'README.md',
);

await writeFile(
  README,
  await prettier.format(
    (await readFile(README, 'utf8'))
      .replace(
        /<!--- start external rules -->.*<!--- end external rules -->/gs,
        `<!--- start external rules -->\n${externalContents}\n<!--- end external rules -->`,
      )
      .replace(
        /<!--- start decorated rules -->.*<!--- end decorated rules -->/gs,
        `<!--- start decorated rules -->\n${decoratedContents}\n<!--- end decorated rules -->`,
      ),
    { ...(prettierOpts as prettier.Options), filepath: README },
  ),
  'utf8',
);
