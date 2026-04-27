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
import angularPlugin from '@angular-eslint/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import type { Rule } from 'eslint';
import { rules as importRules } from 'eslint-plugin-import';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { rules as a11yRules } from './a11y.js';
import { getESLintCoreRule } from './core.js';
import { rules as reactRules } from './react.js';
import { rules as tsEslintRules } from './typescript-eslint/index.js';
import { rules as unicornRules } from './unicorn.js';

const { rules: angularRules } = angularPlugin;
const indexableA11yRules = a11yRules as Record<string, Rule.RuleModule>;
const indexableAngularRules = angularRules as unknown as Record<string, Rule.RuleModule>;
const indexableImportRules = importRules as Record<string, Rule.RuleModule>;
const indexableReactRules = reactRules as Record<string, Rule.RuleModule>;
const indexableStylisticRules = stylistic.rules as Record<string, Rule.RuleModule> | undefined;
const indexableTSEslintRules = tsEslintRules as Record<string, Rule.RuleModule>;
const indexableUnicornRules = unicornRules as Record<string, Rule.RuleModule>;

const externalRuleDefinitions = {
  eslint: getESLintCoreRule,
  'typescript-eslint': (ruleId: string) => indexableTSEslintRules[ruleId],
  'jsx-a11y': (ruleId: string) => indexableA11yRules[ruleId],
  import: (ruleId: string) => indexableImportRules[ruleId],
  react: (ruleId: string) => indexableReactRules[ruleId],
  'react-hooks': (ruleId: string) =>
    (reactHooksPlugin as { rules?: Record<string, Rule.RuleModule> }).rules?.[ruleId],
  '@stylistic/eslint-plugin': (ruleId: string) => indexableStylisticRules?.[ruleId],
  '@angular-eslint': (ruleId: string) => indexableAngularRules[ruleId],
  unicorn: (ruleId: string) => indexableUnicornRules[ruleId],
} satisfies Record<string, (ruleId: string) => Rule.RuleModule | undefined>;

type ExternalPluginId = keyof typeof externalRuleDefinitions;

export const externalPlugins = Object.keys(externalRuleDefinitions) as ExternalPluginId[];

export function getExternalRuleDefinition(
  externalPlugin: string | undefined,
  ruleId: string,
): Rule.RuleModule | undefined {
  if (!externalPlugin) {
    return undefined;
  }
  const lookup = externalRuleDefinitions[externalPlugin as ExternalPluginId];
  return lookup?.(ruleId);
}
