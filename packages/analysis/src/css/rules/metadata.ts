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
import * as metas from './metas.js';
export type { CssRuleMeta, StylelintListParam } from './types.js';
import type { CssRuleDefinition, CssRuleMeta } from './types.js';
export { supportedCssToolDirectives } from './helpers/tool-directives.js';

// Preserve numeric rule order for Java generation and ruling configurations.
const definitions: [string, CssRuleDefinition][] = Object.entries(metas).sort(
  ([left], [right]) => Number(left.slice(1)) - Number(right.slice(1)),
);

/** Flat adapter for the Java generator, ruling, and rule-data deployment. */
export const cssRulesMeta: CssRuleMeta[] = definitions.flatMap(([sqKey, meta]) =>
  meta.bindings.map(binding => ({
    sqKey,
    stylelintKey: binding.stylelintKey,
    ...(binding.listParam && { listParam: binding.listParam }),
    ...(binding.booleanParam && { booleanParam: binding.booleanParam }),
  })),
);

export const reverseCssRuleKeyMap = new Map(cssRulesMeta.map(r => [r.stylelintKey, r.sqKey]));

export const cssOnlyRuleKeys = new Set<string>(
  definitions.flatMap(([, meta]) =>
    meta.bindings.filter(binding => binding.cssOnly).map(binding => binding.stylelintKey),
  ),
);
