/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import stylelint from 'stylelint';
import stylisticPlugins from '@stylistic/stylelint-plugin';
import type { CssRuleDefinition } from '../packages/analysis/src/css/rules/types.js';
import { CSS_RULES_FOLDER, header, listRulesDir, writePrettyFile } from './helpers.js';
import { isRuleKey } from './rule-key.js';

export type CssRuleEntry = { sonarKey: string; meta: CssRuleDefinition };

/** Read metadata directly, so adding a rule does not depend on an existing generated index. */
export async function getCssRulesMetadata(rulesFolder = CSS_RULES_FOLDER): Promise<CssRuleEntry[]> {
  const entries: CssRuleEntry[] = [];
  for (const sonarKey of await listRulesDir(rulesFolder)) {
    const { meta } = await import(pathToFileURL(join(rulesFolder, sonarKey, 'meta.js')).href);
    entries.push({ sonarKey, meta });
  }
  return entries;
}

export function validateCssRulesMetadata(entries: CssRuleEntry[]) {
  const keys = new Set<string>();
  const sonarKeys = new Set<string>();
  for (const { sonarKey, meta } of entries) {
    if (!isRuleKey(sonarKey) || sonarKey === 'S2260' || sonarKeys.has(sonarKey)) {
      throw new Error(
        `Invalid or duplicate CSS rule key: ${sonarKey}. S2260 is reserved for parsing errors.`,
      );
    }
    sonarKeys.add(sonarKey);
    if (!meta?.bindings?.length) {
      throw new Error(`${sonarKey}: define at least one Stylelint binding.`);
    }
    if (!['original', 'decorated', 'external'].includes(meta.implementation)) {
      throw new Error(`${sonarKey}: unknown implementation kind.`);
    }
    if (meta.implementation !== 'external' && meta.bindings.length !== 1) {
      throw new Error(`${sonarKey}: a local plugin must have exactly one Stylelint binding.`);
    }
    const properties = new Set<string>();
    const javaFields = new Set<string>();
    for (const binding of meta.bindings) {
      const { stylelintKey } = binding;
      if (!/^(?:sonar\/|@stylistic\/)?[a-z]+(?:-[a-z0-9]+)*$/.test(stylelintKey)) {
        throw new Error(`${sonarKey}: invalid Stylelint key '${stylelintKey}'.`);
      }
      if (keys.has(stylelintKey)) {
        throw new Error(`Duplicate CSS Stylelint key: ${stylelintKey}.`);
      }
      keys.add(stylelintKey);
      if (binding.cssOnly !== undefined && typeof binding.cssOnly !== 'boolean') {
        throw new Error(`${sonarKey}: cssOnly must be a boolean.`);
      }
      if (meta.implementation === 'external') {
        const exists =
          meta.externalPlugin === 'stylelint'
            ? Object.hasOwn(stylelint.rules, stylelintKey)
            : meta.externalPlugin === '@stylistic/stylelint-plugin' &&
              stylisticPlugins.some(
                (plugin: { ruleName: string }) => plugin.ruleName === stylelintKey,
              );
        if (!exists) {
          throw new Error(
            `${sonarKey}: unknown external rule '${meta.externalPlugin}/${stylelintKey}'.`,
          );
        }
      } else if (!stylelintKey.startsWith('sonar/')) {
        throw new Error(`${sonarKey}: local plugin keys must start with 'sonar/'.`);
      }
      if (binding.listParam && binding.booleanParam) {
        throw new Error(`${sonarKey}: a binding cannot combine list and boolean parameters.`);
      }
      const options = new Set<string>();
      for (const param of [
        ...(binding.listParam ?? []),
        ...(binding.booleanParam ? [binding.booleanParam] : []),
      ]) {
        if (properties.has(param.sqKey) || javaFields.has(param.javaField)) {
          throw new Error(
            `${sonarKey}: duplicate parameter or Java field '${param.sqKey}/${param.javaField}'.`,
          );
        }
        properties.add(param.sqKey);
        javaFields.add(param.javaField);
        const optionKeys =
          'onTrue' in param
            ? param.onTrue.map(option => option.stylelintOptionKey)
            : [param.stylelintOptionKey];
        for (const key of optionKeys) {
          if (options.has(key)) {
            throw new Error(`${sonarKey}: duplicate Stylelint option '${key}'.`);
          }
          options.add(key);
        }
      }
    }
    if (
      meta.implementation === 'decorated' &&
      !Object.hasOwn(stylelint.rules, meta.bindings[0].upstreamRule)
    ) {
      throw new Error(`${sonarKey}: unknown upstream rule '${meta.bindings[0].upstreamRule}'.`);
    }
  }
}

/** Generate static imports without loading any local rule implementations. */
export async function updateCssRuleIndexes(rulesFolder = CSS_RULES_FOLDER) {
  const entries = await getCssRulesMetadata(rulesFolder);
  validateCssRulesMetadata(entries);
  const plugins = entries.filter(({ meta }) => meta.implementation !== 'external');
  for (const { sonarKey } of plugins) {
    await access(join(rulesFolder, sonarKey, 'index.ts'));
    await access(join(rulesFolder, sonarKey, 'rule.ts'));
  }
  const generatedHeader = `${header}\n// DO NOT EDIT! Generated by generate-css-rule-indexes.ts\n\n`;
  await writePrettyFile(
    join(rulesFolder, 'metas.ts'),
    generatedHeader +
      entries
        .map(({ sonarKey }) => `export { meta as ${sonarKey} } from './${sonarKey}/meta.js';`)
        .join('\n'),
  );
  await writePrettyFile(
    join(rulesFolder, 'rules.ts'),
    generatedHeader +
      plugins
        .map(({ sonarKey }) => `export { rule as ${sonarKey} } from './${sonarKey}/index.js';`)
        .join('\n'),
  );
}
