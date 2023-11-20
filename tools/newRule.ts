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
import * as fs from 'fs';
import * as path from 'path';

const rootFolder = path.join(__dirname, '../');
const templatesFolder = path.join(rootFolder, 'tools/resources/');
const ruleIndexPath = path.join(templatesFolder, 'rule.index_ts');
const ruleTemplatePath = path.join(templatesFolder, 'rule.template_ts');
const ruleCBTestPath = path.join(templatesFolder, 'rule.cbtest_ts');
const javaRuleTemplatePath = path.join(templatesFolder, 'rule.template_java');
const checkListPath = path.join(
  rootFolder,
  'sonar-plugin/javascript-checks/src/main/java/org/sonar/javascript/checks/CheckList.java',
);

const mainPath = path.join(rootFolder, 'packages/jsts/src/rules/index.ts');

run();

// example: npm run new-rule S1234 no-something-somewhere
function run() {
  if (process.argv.length < 4) {
    throw new Error(
      `Insufficient number of arguments: expected at least 2, but got ${process.argv.length - 2}`,
    );
  }

  const rspecId = process.argv[2];
  const ruleNameDash = process.argv[3];
  const isEslint = process.argv[4] === 'eslint';

  verifyRspecId();
  verifyRuleName();

  const javaRuleClassName = getJavaClassName();

  //- Create file for rule implementation in src/rules.
  //- Create test folder in test/rules with the name of the rule file
  //- In this folder create files <rule file name>.test.ts
  createTsFiles(isEslint);

  updateMain(isEslint);

  //- Create file for rule in java part
  createJavaFile();

  // Add java rule class to CheckList.java
  updateCheckList();

  /** Creates rule typescript source and test files from templates */
  function createTsFiles(isEslint: boolean) {
    if (isEslint) {
      return;
    }

    const ruleFolder = path.join(rootFolder, `packages/jsts/src/rules`, rspecId);
    try {
      fs.mkdirSync(ruleFolder);
    } catch {
      // already exists
    }

    fs.copyFileSync(ruleIndexPath, path.join(ruleFolder, `index.ts`));

    const ruleMetadata: { [x: string]: string } = {};
    ruleMetadata['___RULE_NAME_DASH___'] = ruleNameDash;
    ruleMetadata['___RULE_CLASS_NAME___'] = javaRuleClassName;
    ruleMetadata['___RULE_KEY___'] = rspecId;

    inflateTemplate(ruleTemplatePath, path.join(ruleFolder, `rule.ts`), ruleMetadata);

    fs.writeFileSync(
      path.join(ruleFolder, `cb.test.ts`),
      fs.readFileSync(ruleCBTestPath, 'utf8').replace('${sonarId}', rspecId),
    );
    fs.writeFileSync(path.join(ruleFolder, `cb.fixture.ts`), '');
  }

  /** Creates rule java source from template */
  function createJavaFile() {
    const ruleMetadata: { [x: string]: string } = {};
    ruleMetadata['___RULE_NAME_DASH___'] = ruleNameDash;
    ruleMetadata['___JAVA_RULE_CLASS_NAME___'] = javaRuleClassName;
    ruleMetadata['___RULE_KEY___'] = rspecId;
    inflateTemplate(
      javaRuleTemplatePath,
      path.join(
        rootFolder,
        `sonar-plugin/javascript-checks/src/main/java/org/sonar/javascript/checks/${javaRuleClassName}.java`,
      ),
      ruleMetadata,
    );
  }

  function updateCheckList() {
    const { head1, imports, head2, rules, tail } = parseCheckList();
    let lastRule = rules[rules.length - 1];
    rules[rules.length - 1] = lastRule + ',';
    rules.push(`      ${javaRuleClassName}.class,`);

    rules.sort();
    lastRule = rules[rules.length - 1];
    // remove comma
    rules[rules.length - 1] = lastRule.slice(0, lastRule.length - 1);

    fs.writeFileSync(checkListPath, [...head1, ...imports, ...head2, ...rules, ...tail].join('\n'));
  }

  function parseCheckList() {
    const readme = fs.readFileSync(checkListPath, 'utf8');

    const lines = readme.split('\n');

    const head1: string[] = [];
    const imports: string[] = [];
    const head2: string[] = [];
    const rules: string[] = [];
    const tail: string[] = [];

    let state = 0;

    for (const line of lines) {
      switch (state) {
        case 0:
          processHead1(line);
          break;
        case 1:
          processImports(line);
          break;
        case 2:
          processHead2(line);
          break;
        case 3:
          processRule(line);
          break;
        case 4:
          tail.push(line);
          break;
      }
    }

    return { head1, head2, imports, rules, tail };

    function processHead1(line: string) {
      if (line.trim().startsWith('import')) {
        state++;
        imports.push(line);
      } else {
        head1.push(line);
      }
    }

    function processHead2(line: string) {
      if (line.trim() === 'return Arrays.asList(') {
        state++;
      }
      head2.push(line);
    }

    function processImports(line: string) {
      if (!line.trim().startsWith('import')) {
        state++;
        head2.push(line);
      } else {
        imports.push(line);
      }
    }

    function processRule(line: string) {
      if (line.trim() === ');') {
        state++;
        tail.push(line);
      } else {
        rules.push(line);
      }
    }
  }

  function updateMain(isEslint: boolean) {
    if (isEslint) {
      return;
    }

    const { head1, imports, head2, rules, tail } = parseMain();
    const comment = (s: String) => s.replace(/^.*;/, '');

    imports.push(`import { rule as ${rspecId} } from './${rspecId}'; // ${ruleNameDash}`);
    imports.sort((a, b) => comment(a).localeCompare(comment(b)));

    rules.push(`rules['${ruleNameDash}'] = ${rspecId};`);
    rules.sort();

    fs.writeFileSync(mainPath, [...head1, ...imports, ...head2, ...rules, ...tail].join('\n'));
  }

  function parseMain() {
    const readme = fs.readFileSync(mainPath, 'utf8');

    const lines = readme.split('\n');

    const head1: string[] = [];
    const imports: string[] = [];
    const head2: string[] = [];
    const rules: string[] = [];
    const tail: string[] = [];

    let state = 0;

    for (const line of lines) {
      switch (state) {
        case 0:
          processHead1(line);
          break;
        case 1:
          processImports(line);
          break;
        case 2:
          processHead2(line);
          break;
        case 3:
          processRule(line);
          break;
        case 4:
          tail.push(line);
          break;
      }
    }

    return { head1, head2, imports, rules, tail };

    function processHead1(line: string) {
      if (line.trim().startsWith('import { rule as')) {
        state++;
        imports.push(line);
      } else {
        head1.push(line);
      }
    }

    function processHead2(line: string) {
      if (line.trim().startsWith('rules[')) {
        state++;
        rules.push(line);
      } else {
        head2.push(line);
      }
    }

    function processImports(line: string) {
      if (!line.trim().startsWith('import')) {
        state++;
        head2.push(line);
      } else {
        imports.push(line);
      }
    }

    function processRule(line: string) {
      if (!line.trim().startsWith('rules[')) {
        state++;
        tail.push(line);
      } else {
        rules.push(line);
      }
    }
  }

  function verifyRuleName() {
    const re = /^[a-z]+(-[a-z0-9]+)*$/;
    if (!ruleNameDash.match(re)) {
      throw new Error(`Invalid class name: it should match ${re}, but got "${ruleNameDash}"`);
    }
  }

  function verifyRspecId() {
    const re = /^S[0-9]+$/;
    if (!rspecId.match(re)) {
      throw new Error(`Invalid rspec key: it should match ${re}, but got "${rspecId}"`);
    }
  }

  function getJavaClassName() {
    let name = ruleNameDash.replace(/(-[a-z])/g, match => match[1].toUpperCase());
    name = name[0].toUpperCase() + name.slice(1) + 'Check';
    return name;
  }
}

function escapeRegExp(str: string) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

function replace(text: string, dictionary: { [x: string]: string }): string {
  for (const tok in dictionary) {
    text = text.replace(new RegExp(escapeRegExp(tok), 'g'), dictionary[tok]);
  }
  return text;
}

function inflateTemplate(templatePath: string, dest: string, dict: { [x: string]: string }) {
  const template = fs.readFileSync(templatePath, 'utf8');
  const inflatedTemplate = replace(template, dict);
  fs.writeFileSync(dest, inflatedTemplate);
}
