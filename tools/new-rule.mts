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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checkbox, input, select } from '@inquirer/prompts';
import {
  DIRNAME,
  inflateTemplateToFile,
  ruleRegex,
  RULES_FOLDER,
  TS_TEMPLATES_FOLDER,
  verifyRuleName,
} from './helpers.js';
import { generateMetaForRule } from './generate-eslint-meta.js';
import { generateJavaCheckClass } from './generate-java-rule-classes.js';

const header = await readFile(join(DIRNAME, 'header.ts'), 'utf8');

const sonarKey = await input({ message: 'Enter the Sonar key for the new rule (SXXXX)' });
const eslintId = await input({ message: 'Enter the ESLint ID for the rule' });
const scope = (await select({
  message: 'What code does the rule target?',
  choices: [
    {
      value: 'Main',
    },
    {
      value: 'Tests',
    },
  ],
})) satisfies 'Main' | 'Tests';
const implementation = await select({
  message: 'Origin of the rule',
  choices: [
    {
      name: 'Sonar pure implementation',
      value: 'original',
    },
    {
      name: 'External rule to be used directly',
      value: 'external',
    },
    {
      name: 'Rule will decorate an external rule',
      value: 'decorated',
    },
  ],
});
const languages = (await checkbox({
  message: 'What languages will the rule support?',
  choices: [
    {
      value: 'JAVASCRIPT',
      checked: true,
    },
    {
      value: 'TYPESCRIPT',
      checked: true,
    },
  ],
  required: true,
})) satisfies ('JAVASCRIPT' | 'TYPESCRIPT')[];
const hasSecondaries = await select({
  message: 'Will the rule produce secondary locations?',
  choices: [
    {
      value: true,
      name: 'Yes',
    },
    {
      value: false,
      name: 'No',
    },
  ],
});

function verifyRspecId(sonarKey: string) {
  if (!ruleRegex.exec(sonarKey)) {
    throw new Error(`Invalid rspec key: it should match ${ruleRegex}, but got "${sonarKey}"`);
  }
}

verifyRspecId(sonarKey);
verifyRuleName(eslintId);

const ruleFolder = join(RULES_FOLDER, sonarKey);

await mkdir(ruleFolder, { recursive: true });

if (implementation !== 'external') {
  // index.ts
  await writeFile(join(ruleFolder, `index.ts`), `${header}export { rule } from './rule.js';\n`);
  // rule.ts
  await inflateTemplateToFile(
    join(
      TS_TEMPLATES_FOLDER,
      implementation === 'original' ? 'rule.template' : 'rule.decorated.template',
    ),
    join(ruleFolder, `rule.ts`),
    {
      ___HEADER___: header,
      ___RULE_KEY___: sonarKey,
    },
  );

  // cb.test.ts
  await inflateTemplateToFile(
    join(TS_TEMPLATES_FOLDER, 'rule.cbtest.template'),
    join(ruleFolder, `cb.test.ts`),
    {
      ___HEADER___: header,
      ___RULE_KEY___: sonarKey,
    },
  );

  // empty cb.fixture.ts
  await writeFile(join(ruleFolder, `cb.fixture.ts`), '');
} else {
  // index.ts
  await writeFile(
    join(ruleFolder, `index.ts`),
    `${header}\nimport { rules } from 'external-plugin';\nexport const rule = rules('rule-name');\n`,
  );
}

// meta.ts
let extra = '';
if (implementation === 'decorated') {
  extra = `export const externalRules = [\n  { externalPlugin: 'plugin-name', externalRule: '${eslintId}' },\n];\n`;
} else if (implementation === 'external') {
  extra = `export const externalPlugin = 'plugin-name';\n`;
}
if (hasSecondaries) {
  extra += `export const hasSecondaries = true;\n`;
}
console.log(JSON.stringify(languages));
await inflateTemplateToFile(
  join(TS_TEMPLATES_FOLDER, 'meta.template'),
  join(ruleFolder, `meta.ts`),
  {
    ___HEADER___: header,
    ___IMPLEMENTATION___: implementation,
    ___ESLINT_ID___: eslintId,
    ___EXTRA___: extra,
    ___RULE_KEY___: sonarKey,
  },
);

// preliminary generated-meta.ts
await generateMetaForRule(sonarKey, { compatibleLanguages: languages, scope });

// generate rule java class
await generateJavaCheckClass(sonarKey, { compatibleLanguages: languages, scope });

console.log(`
NEXT STEPS:
1. If your rule accepts parameters, export a schema in the meta.ts file. Customize default values in a 'config.ts' file
2. After RSPEC for the new rule has been generated, run 'npm run generate-meta'
`);

if (implementation === 'decorated') {
  console.log(
    'Please add all rules used in this decorated rule to the "externalRules" array in "meta.ts"',
  );
}

await import('./generate-rule-indexes.js');
