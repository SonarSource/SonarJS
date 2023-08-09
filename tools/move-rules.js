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

const fs = require('fs');
const path = require('path');

const rootFolder = path.join(__dirname, '../');
const rulesFolder = path.join(rootFolder, 'packages/jsts/src/rules');
const testsFolder = path.join(rootFolder, 'packages/jsts/tests/rules');
const cbtFolder = path.join(rootFolder, 'packages/jsts/tests/rules/comment-based');

const ruleIndexTemplate = fs.readFileSync(path.join(__dirname, 'resources/rule.index_ts'), 'utf8');
const cbtLaunchTemplate = fs.readFileSync(path.join(__dirname, 'resources/rule.launch_ts'), 'utf8');

const localToFilename = {};
const eslintToLocal = {};

const indexFile = path.join(rulesFolder, 'index.ts');
let indexFileContent = fs.readFileSync(indexFile, 'utf8');

indexFileContent.split('\n').forEach(line => {
  if (line.match(/import \{ rule as (\w+) \} from '.\/([\w-]+)';/)) {
    const localVar = RegExp.$1;
    const filename = RegExp.$2;

    localToFilename[localVar] = filename;
  }

  if (line.match(/rules\['*([\w-]+)'*\] = (\w+);/)) {
    const eslintId = RegExp.$1;
    const localVar = RegExp.$2;

    eslintToLocal[eslintId] = localVar;
  }
});

const checksFolder = path.join(
  rootFolder,
  'sonar-plugin/javascript-checks/src/main/java/org/sonar/javascript/checks',
);

fs.readdirSync(checksFolder).forEach(name => {
  if (!name.endsWith('.java')) {
    return;
  }

  const javaFileContent = fs.readFileSync(path.join(checksFolder, name), 'utf8');

  if (!javaFileContent.match(/@Rule\(key = "(S\d+)"\)[\s\S]+ eslintKey\W+return "([\w-]+)"/)) {
    return;
  }

  const sonarId = RegExp.$1;
  const eslintId = RegExp.$2;

  const localVar = eslintToLocal[eslintId];

  if (!localVar) {
    return;
  }

  const filename = localToFilename[localVar];

  if (!filename || filename === sonarId) {
    return;
  }

  const oldImport = `import { rule as ${localVar} } from './${filename}';`;
  const newImport = `import { rule as ${sonarId} } from './${sonarId}'; // ${filename}`;

  indexFileContent = indexFileContent.replace(oldImport, newImport);

  const oldMap = `rules['${eslintId}'] = ${localVar};`;
  const newMap = `rules['${eslintId}'] = ${sonarId};`;

  indexFileContent = indexFileContent.replace(oldMap, newMap);

  const ruleFile = path.join(rulesFolder, `${filename}.ts`);

  if (!fs.existsSync(ruleFile)) {
    return;
  }

  let ruleFileContent = fs.readFileSync(ruleFile, 'utf8');

  ruleFileContent = ruleFileContent.replace(/ from '\.\.\//g, " from '../../");
  ruleFileContent = ruleFileContent.replace(/ from '\.\//g, " from '../");

  fs.mkdirSync(path.join(rulesFolder, sonarId));
  fs.writeFileSync(path.join(rulesFolder, sonarId, 'index.ts'), ruleIndexTemplate, 'utf8');
  fs.writeFileSync(path.join(rulesFolder, sonarId, 'rule.ts'), ruleFileContent, 'utf8');
  fs.rmSync(ruleFile);

  const testFile = path.join(testsFolder, `${filename}.test.ts`);

  if (fs.existsSync(testFile)) {
    let testFileContent = fs.readFileSync(testFile, 'utf8');
    testFileContent = testFileContent.replace(
      /import \{ rule \} from [^;]+/,
      "import { rule } from './'",
    );
    fs.writeFileSync(path.join(rulesFolder, sonarId, 'unit.test.ts'), testFileContent, 'utf8');
    fs.rmSync(testFile);
  }

  const availableCBT = [];

  ['js', 'ts', 'jsx', 'tsx', 'vue'].forEach(ext => {
    const cbtFile = path.join(cbtFolder, `${filename}.${ext}`);
    if (fs.existsSync(cbtFile)) {
      availableCBT.push(ext);
      fs.renameSync(cbtFile, path.join(rulesFolder, sonarId, `cb.fixture.${ext}`));
    }
  });

  if (availableCBT.length) {
    fs.writeFileSync(path.join(rulesFolder, sonarId, 'cb.test.ts'), cbtLaunchTemplate, 'utf8');
  }
});

fs.writeFileSync(indexFile, indexFileContent, 'utf8');
console.log(indexFileContent);
