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
import type { RuleFilter } from './rule-filter.js';

const JSX_ONLY_PLUGINS = new Set(['react', 'react-native', 'react-hooks']);

/**
 * Disables React-specific rules on Vue files.
 * A rule is considered React-specific when:
 * - its requiredDependency includes 'react' or 'react-native', or
 * - its externalPlugin is 'react', or
 * - all its externalRules come from JSX-only plugins (react, react-native, react-hooks).
 *
 * Rules with mixed external plugins (e.g. eslint + react) are NOT excluded,
 * preserving coverage from non-React delegates.
 */
export const filterReactVue: RuleFilter = (_config, meta, ctx) => {
  if (!meta || ctx.extensionName.toLowerCase() !== '.vue') {
    return true;
  }
  const isReactRequired =
    'requiredDependency' in meta &&
    (meta.requiredDependency as string[]).some(
      dependency => dependency === 'react' || dependency === 'react-native',
    );
  const isReactExternalPlugin = 'externalPlugin' in meta && meta.externalPlugin === 'react';
  const isReactExternalRule =
    'externalRules' in meta &&
    (meta.externalRules as { externalPlugin: string }[]).length > 0 &&
    (meta.externalRules as { externalPlugin: string }[]).every(({ externalPlugin }) =>
      JSX_ONLY_PLUGINS.has(externalPlugin),
    );
  return !(isReactRequired || isReactExternalPlugin || isReactExternalRule);
};
