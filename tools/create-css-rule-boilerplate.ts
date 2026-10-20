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
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CssRuleDefinition } from '../packages/analysis/src/css/rules/types.js';
import {
  CSS_RULES_FOLDER,
  CSS_TEMPLATES_FOLDER,
  header,
  inflateTemplateToFile,
  writePrettyFile,
} from './helpers.js';
import {
  getCssRulesMetadata,
  updateCssRuleIndexes,
  validateCssRulesMetadata,
} from './generate-css-rule-indexes.js';

export async function createNewCssRule(
  sonarKey: string,
  meta: CssRuleDefinition,
  rulesFolder = CSS_RULES_FOLDER,
) {
  validateCssRulesMetadata([...(await getCssRulesMetadata(rulesFolder)), { sonarKey, meta }]);
  const ruleFolder = join(rulesFolder, sonarKey);
  // Fail rather than overwrite an existing rule folder.
  await mkdir(ruleFolder);
  const dictionary = {
    ___HEADER___: header,
    ___RULE_KEY___: sonarKey,
    ___METADATA___: JSON.stringify(meta, null, 2),
  };
  await inflateTemplateToFile(
    join(CSS_TEMPLATES_FOLDER, 'meta.template'),
    join(ruleFolder, 'meta.ts'),
    dictionary,
  );
  if (meta.implementation !== 'external') {
    await writePrettyFile(
      join(ruleFolder, 'index.ts'),
      `${header}export { rule } from './rule.js';\n`,
    );
    await inflateTemplateToFile(
      join(
        CSS_TEMPLATES_FOLDER,
        meta.implementation === 'original' ? 'rule.template' : 'rule.decorated.template',
      ),
      join(ruleFolder, 'rule.ts'),
      dictionary,
    );
  }
  await inflateTemplateToFile(
    join(CSS_TEMPLATES_FOLDER, 'rule.test.template'),
    join(ruleFolder, 'unit.test.ts'),
    dictionary,
  );
  await updateCssRuleIndexes(rulesFolder);
}
