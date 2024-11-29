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
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { input, select } from '@inquirer/prompts';
import {
  DIRNAME,
  generateMetaForRule,
  inflateTemplateToFile,
  JAVA_TEMPLATES_FOLDER,
  javaChecksPath,
  RULES_FOLDER,
  TS_TEMPLATES_FOLDER,
  verifyRspecId,
  verifyRuleName,
} from './helpers.js';

const header = await readFile(join(DIRNAME, 'header.ts'), 'utf8');

const sonarKey = await input({ message: 'Enter the Sonar key for the new rule (SXXXX)' });
const eslintId = await input({ message: 'Enter the ESLint ID for the rule' });
const ruleTarget = await select({
  message: 'What code does the rule target?',
  choices: [
    {
      value: 'MAIN',
    },
    {
      value: 'TEST',
    },
  ],
});
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

verifyRspecId(sonarKey);
verifyRuleName(eslintId);

const ruleFolder = join(RULES_FOLDER, sonarKey);

await mkdir(ruleFolder, { recursive: true });

if (implementation !== 'external') {
  // index.ts
  await writeFile(join(ruleFolder, `index.ts`), `${header}export { rule } from './rule';\n`);
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
  extra = `export const externalRules = [\n  { externalPlugin: 'plugin-name', externalRule: '${eslintId}' },\n];`;
} else if (implementation === 'external') {
  extra = `export const externalPlugin = 'plugin-name';`;
}
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
await generateMetaForRule(sonarKey);

// Create rule java source from template
await inflateTemplateToFile(
  join(JAVA_TEMPLATES_FOLDER, ruleTarget === 'MAIN' ? 'rule.main.template' : 'rule.test.template'),
  join(javaChecksPath('main'), `${sonarKey}.java`),
  {
    ___JAVA_RULE_CLASS_NAME___: sonarKey,
    ___RULE_KEY___: sonarKey,
    ___PROPERTIES___: await readFile(join(JAVA_TEMPLATES_FOLDER, 'properties'), 'utf8'),
    ___HEADER___: header,
  },
);

// Create rule java test from template
await inflateTemplateToFile(
  join(JAVA_TEMPLATES_FOLDER, 'ruletest.template'),
  join(javaChecksPath('test'), `${sonarKey}Test.java`),
  {
    ___JAVA_RULE_CLASS_NAME___: sonarKey,
    ___HEADER___: header,
  },
);

console.log(`
STEPS
1. If your rule accepts parameters, please add the JSON Schema to "sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/schemas"
2. After RSPEC for the new rule has been generated, run 'npm run generate-meta'
`);

if (implementation === 'decorated') {
  console.log(
    'Please add all rules used in this decorated rule to the "externalRules" array in "meta.ts"',
  );
}

await import('./generate-rule-indexes.js');
