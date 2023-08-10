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
const decoratorsFolder = path.join(rootFolder, 'packages/jsts/src/rules/decorators');
const testsFolder = path.join(rootFolder, 'packages/jsts/tests/rules/decorators');
const cbtFolder = path.join(rootFolder, 'packages/jsts/tests/rules/comment-based');

const decoratedTemplate = fs.readFileSync(path.join(__dirname, 'resources/rule.decor_ts'), 'utf8');
const cbtLaunchTemplate = fs.readFileSync(path.join(__dirname, 'resources/rule.launch_ts'), 'utf8');

const localToFilename = {};
const eslintToLocal = {};

const indexFile = path.join(decoratorsFolder, 'index.ts');
let indexFileContent = fs.readFileSync(indexFile, 'utf8');
indexFileContent = indexFileContent.replace('semi: decorateSemi', "'semi': decorateSemi");

indexFileContent.split('\n').forEach(line => {
  if (line.match(/import \{ (decorate\w+) \} from '.\/([\w-]+)';/)) {
    const localVar = RegExp.$1;
    const filename = RegExp.$2;

    localToFilename[localVar] = filename;
  }

  if (line.match(/'([\w-]+)': (decorate\w+)/)) {
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

  const oldImport = `import { ${localVar} } from './${filename}';`;
  const newImport = `import { rule as ${sonarId} } from './${sonarId}'; // ${eslintId}`;

  indexFileContent = indexFileContent.replace(oldImport, newImport);

  const oldMap = `'${eslintId}': ${localVar},`;
  const newMap = `rules['${eslintId}'] = ${sonarId};`;

  indexFileContent = indexFileContent.replace(oldMap, newMap);

  const decoratorFile = path.join(decoratorsFolder, `${filename}.ts`);

  if (!fs.existsSync(decoratorFile)) {
    return;
  }

  let decoratorContent = fs.readFileSync(decoratorFile, 'utf8');

  decoratorContent = decoratorContent.replace(/ from '\.\//g, " from '../");
  decoratorContent = decoratorContent.replace(
    /export function decorate\w+/,
    'export function decorate',
  );

  let ruleIndex = decoratedTemplate.replace('__ESLINTID__', eslintId);

  fs.mkdirSync(path.join(rulesFolder, sonarId));
  fs.writeFileSync(path.join(rulesFolder, sonarId, 'index.ts'), ruleIndex, 'utf8');
  fs.writeFileSync(path.join(rulesFolder, sonarId, 'decorator.ts'), decoratorContent, 'utf8');
  fs.rmSync(decoratorFile);

  const testFile = path.join(testsFolder, `${filename}.test.ts`);

  if (fs.existsSync(testFile)) {
    let testFileContent = fs.readFileSync(testFile, 'utf8');
    testFileContent = testFileContent.replace(/import \{ eslintRules.+\n/, '');
    testFileContent = testFileContent.replace(/import \{ decorate.+/, "import { rule } from './';");
    testFileContent = testFileContent.replace(/const rule = decorate.+\n/, '');
    testFileContent = testFileContent.replace("from '../../tools'", "from '../tools'");
    fs.writeFileSync(path.join(rulesFolder, sonarId, 'unit.test.ts'), testFileContent, 'utf8');
    fs.rmSync(testFile);
  }

  const availableCBT = [];

  ['js', 'ts', 'jsx', 'tsx', 'vue'].forEach(ext => {
    const cbtFile = path.join(cbtFolder, `${eslintId}.${ext}`);
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
