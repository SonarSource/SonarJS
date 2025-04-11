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
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Script to count the rules in SonarJS for CSS, JS and TS and update the README.md file.
 */

const pathToJsTsRules = path.join(
  import.meta.dirname,
  '..',
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
const pathToCssRules = path.join(
  import.meta.dirname,
  '..',
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

const jsTsRules = await getJsonFiles(pathToJsTsRules);

const jsRules = jsTsRules.filter(rule => rule.compatibleLanguages.includes('js'));
const tsRules = jsTsRules.filter(rule => rule.compatibleLanguages.includes('ts'));

const cssRules = await getJsonFiles(pathToCssRules);

console.log('Checking rule counts');
console.log(`JS/TS rules: ${jsTsRules.length}`);
console.log(`JS rules: ${jsRules.length}`);
console.log(`TS rules: ${tsRules.length}`);
console.log(`CSS rules: ${cssRules.length}`);

await updateReadmeFile();

async function updateReadmeFile() {
  const PATH_TO_README = path.join(import.meta.dirname, '..', 'README.md');
  const readmeContent = await fs.readFile(PATH_TO_README, 'utf-8');
  const replacements = [
    { pattern: /\d+ JS rules/, replacement: `${jsRules.length} JS rules` },
    { pattern: /\d+ TS rules/, replacement: `${tsRules.length} TS rules` },
    { pattern: /\d+ CSS rules/, replacement: `${cssRules.length} CSS rules` },
  ];
  let updatedContent = readmeContent;
  replacements.forEach(({ pattern, replacement }) => {
    updatedContent = updatedContent.replace(pattern, replacement);
  });
  if (updatedContent !== readmeContent) {
    console.log('Updating README.md with new rule counts');
    await fs.writeFile(PATH_TO_README, updatedContent);
  }
}

async function getJsonFiles(pathToRules: string) {
  const filenames = await fs.readdir(pathToRules);
  return Promise.all(
    filenames
      .filter(filename => filename.endsWith('.json') && filename.length <= 'S1234.json'.length)
      .map(async file => JSON.parse(await fs.readFile(path.join(pathToRules, file), 'utf-8'))),
  );
}
