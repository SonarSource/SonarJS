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

import { join } from 'node:path/posix';
import { header, inflateTemplateToFile, RULES_FOLDER, TS_TEMPLATES_FOLDER } from './helpers.js';
import { mkdir } from 'node:fs/promises';
import { writeFile } from 'fs/promises';
import { generateMetaForRule } from './generate-eslint-meta.js';
import { generateJavaCheckClass } from './generate-java-rule-classes.js';
import { updateIndexes } from './generate-rule-indexes.js';

const JS_RULE_DATA_FOLDER = join(
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

const MISSING_RSPEC_JS_RULE_DATA_FOLDER = join('resources', 'rule-data', 'javascript');

export async function createNewRule(
  sonarKey: string,
  eslintId: string,
  implementation: 'original' | 'external' | 'decorated',
  languages: ('js' | 'ts')[],
  scope: 'Main' | 'Tests',
  hasSecondaries?: boolean,
  externalPackage?: { name: string; prefix: string; rulesImport?: string },
  missingRspec?: boolean,
) {
  const ruleFolder = join(RULES_FOLDER, sonarKey);

  await mkdir(ruleFolder, { recursive: true });

  if (missingRspec) {
    await writeFile(
      join(JS_RULE_DATA_FOLDER, `${sonarKey}.json`),
      JSON.stringify(
        {
          title: 'Description',
          tags: [],
          type: 'BUG',
          status: 'ready',
          scope: scope,
          compatibleLanguages: languages,
          quickfix: undefined,
          defaultQualityProfiles: ['Sonar way'],
        },
        null,
        2,
      ),
    );
    await writeFile(join(JS_RULE_DATA_FOLDER, `${sonarKey}.html`), '<html></html>');
  }

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
    const importRules =
      externalPackage?.rulesImport ??
      `import { rules } from '${externalPackage?.name ?? 'external-plugin'}';`;
    await writeFile(
      join(ruleFolder, `index.ts`),
      `${header}\n${importRules}\nexport const rule = rules['${eslintId}'];\n`,
    );
  }

  // meta.ts
  let extra = '';
  if (implementation === 'decorated') {
    extra = `export const externalRules = [\n  { externalPlugin: '${externalPackage?.prefix ?? 'plugin-name'}', externalRule: '${eslintId}' },\n];\n`;
  } else if (implementation === 'external') {
    extra = `export const externalPlugin = '${externalPackage?.prefix ?? 'plugin-name'}';\n`;
  }
  if (hasSecondaries) {
    extra += `export const hasSecondaries = true;\n`;
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

  await updateIndexes();
}
