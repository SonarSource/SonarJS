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
import * as metas from '../../../jsts/src/rules/metas.js';
import type { RuleMeta } from './types.js';

/**
 * Lookup map from SonarQube rule key (e.g., 'S100', 'S107') to rule metadata.
 *
 * This map is built at module load time by iterating over all exported rule
 * metadata from `packages/jsts/src/rules/metas.js`. Each rule's `meta.ts` file
 * exports a `sonarKey` which is used as the map key.
 *
 * The metadata includes:
 * - `sonarKey`: The SonarQube rule identifier
 * - `scope`: Whether the rule applies to 'Main' or 'Tests' files
 * - `languages`: Which languages the rule supports ('js', 'ts', or both)
 * - `fields`: Optional ESLint configuration schema for rule parameters
 *
 * @see docs/DEV.md "Rule Options Architecture" section for how rules are structured
 * @see RULE_CONFIG_PATTERNS.md for the different configuration patterns
 */
export const ruleMetaMap: Map<string, RuleMeta> = new Map();
for (const [, ruleMeta] of Object.entries(metas)) {
  const meta = ruleMeta as RuleMeta;
  if (meta.sonarKey) {
    ruleMetaMap.set(meta.sonarKey, meta);
  }
}
