/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { defaultOptions } from '../packages/analysis/src/jsts/rules/helpers/configs.js';
import {
  getESLintDefaultConfiguration,
  getRspecMeta,
  header,
  inflateTemplateToFile,
  METADATA_FOLDER,
  RULES_FOLDER,
  TS_TEMPLATES_FOLDER,
  typeMatrix,
} from './helpers.js';
import { readFile } from 'fs/promises';

const sonarWayProfile = JSON.parse(
  await readFile(join(METADATA_FOLDER, `Sonar_way_profile.json`), 'utf-8'),
);

/**
 * From the RSPEC json file, creates a generated-meta.ts file with ESLint formatted metadata
 *
 * @param sonarKey rule ID for which we need to create the generated-meta.ts file
 * @param defaults if rspec not found, extra properties to set. Useful for the new-rule script
 */
export async function generateMetaForRule(
  sonarKey: string,
  defaults?: { compatibleLanguages?: ('js' | 'ts')[]; scope?: 'Main' | 'Tests' },
) {
  const ruleRspecMeta = await getRspecMeta(sonarKey, defaults);
  if (!typeMatrix[ruleRspecMeta.type]) {
    console.log(`Type not found for rule ${sonarKey}`);
  }

  const ruleFolder = join(RULES_FOLDER, sonarKey);
  const eslintConfiguration = await getESLintDefaultConfiguration(sonarKey);

  // Extract ES year from tags like ["es2022", "performance"]
  const ecmaTag = ruleRspecMeta.tags.find((t: string) => /^es20\d\d$/i.test(t));
  const requiredEcmaVersion = ecmaTag ? Number.parseInt(ecmaTag.slice(2), 10) : undefined;
  const requiredModuleType = getRequiredModuleType(sonarKey, ruleRspecMeta.tags);

  await inflateTemplateToFile(
    join(TS_TEMPLATES_FOLDER, 'generated-meta.template'),
    join(ruleFolder, `generated-meta.ts`),
    {
      ___HEADER___: header,
      ___RULE_TYPE___: typeMatrix[ruleRspecMeta.type],
      ___RULE_KEY___: sonarKey,
      ___DESCRIPTION___: ruleRspecMeta.title.replace(/'/g, "\\'"),
      ___RECOMMENDED___: sonarWayProfile.ruleKeys.includes(sonarKey),
      ___TYPE_CHECKING___: `${ruleRspecMeta.tags.includes('type-dependent')}`,
      ___FIXABLE___: ruleRspecMeta.quickfix === 'covered' ? "'code'" : undefined,
      ___DEPRECATED___: `${ruleRspecMeta.status === 'deprecated'}`,
      ___DEFAULT_OPTIONS___: JSON.stringify(defaultOptions(eslintConfiguration), null, 2),
      ___LANGUAGES___: JSON.stringify(ruleRspecMeta.compatibleLanguages),
      ___SCOPE___: ruleRspecMeta.scope,
      ___REQUIRED_DEPENDENCY___: JSON.stringify(ruleRspecMeta.extra?.requiredDependency ?? []),
      ___REQUIRED_MODULE_TYPE_EXPORT___:
        requiredModuleType !== undefined
          ? `export const requiredModuleType = '${requiredModuleType}';`
          : '',
      ___REQUIRED_ECMA_VERSION_EXPORT___:
        requiredEcmaVersion !== undefined
          ? `export const requiredEcmaVersion = ${requiredEcmaVersion};`
          : '',
    },
  );
}

function getRequiredModuleType(
  sonarKey: string,
  tags: string[],
): 'module' | 'commonjs' | undefined {
  const esmOnly = tags.includes('esm-only') || tags.includes('esm_only');
  const cjsOnly = tags.includes('cjs-only') || tags.includes('cjs_only');
  if (esmOnly && cjsOnly) {
    throw new Error(`Rule ${sonarKey} cannot have both 'esm-only' and 'cjs-only' tags`);
  }
  if (esmOnly) {
    return 'module';
  }
  if (cjsOnly) {
    return 'commonjs';
  }
  return undefined;
}
