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
import type { ESLint } from 'eslint';
import { createConfigs, meta } from './plugin-factory.js';
import * as metas from './metas.js';
import { ruleKeys, rules } from './plugin-rules-full.js';

const recommendedRules = new Set(
  Object.values(metas)
    .filter(ruleMetadata => ruleMetadata.meta.docs?.recommended)
    .map(ruleMetadata => ruleKeys[ruleMetadata.sonarKey]),
);

export const configs = createConfigs(rules, recommendedRules);
export { meta };

const plugin: ESLint.Plugin = { rules, configs, meta };
export default plugin;

export { rules } from './plugin-rules-full.js';
export { ruleKeys } from './plugin-rules-full.js';
