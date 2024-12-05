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
import { fileURLToPath } from 'node:url';

/**
 * This script updates the changelog for the eslint plugin located in
 * packages/jsts/src/rules/CHANGELOG.md
 *
 * Just run the script with the new version that needs to be added
 *
 * node tools/update-changelog.js 3.0.0
 *
 * This is not yet automatized in the CI but should be added to the
 * eslint-plugin-sonarjs release action. Until then, we need to run
 * this manually
 */

const version = process.argv[2];

const response = await fetch(
  encodeURI(
    `https://sonarsource.atlassian.net/rest/api/2/search?jql=fixVersion=${version} and project="ESLINTJS"`,
  ),
);
if (!response.ok) {
  throw new Error(`Response status: ${response.status}`);
}

export const DIRNAME = dirname(fileURLToPath(import.meta.url));
const changelogPath = join(DIRNAME, '..', 'packages', 'jsts', 'src', 'rules', 'CHANGELOG.md');
const changelog = await readFile(changelogPath, 'utf8').catch(() => '');

const json = await response.json();
let newVersionStr = `## ${json.issues[0].fields.fixVersions[0].releaseDate}, Version ${version}\n\n`;
json.issues.forEach(issue => {
  newVersionStr += `* \[[${issue.key}](https://sonarsource.atlassian.net/browse/${issue.key})] - ${issue.fields.summary}\n`;
});
newVersionStr += '\n';

await writeFile(changelogPath, newVersionStr + changelog);
