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
import type { Linter, Rule } from 'eslint';
import type estree from 'estree';
import merge from 'lodash.merge';
import * as ruleMetas from '../rules/metas.js';
import * as rules from '../rules/rules.js';
import { getExternalRuleDefinition } from '../rules/external/registry.js';
import type { SonarMeta } from '../rules/helpers/generate-meta.js';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';

const sonarRules = rules as Record<string, Rule.RuleModule>;

type MappingEntry = {
  ruleId: string;
  directiveRuleDefinition: Rule.RuleModule;
};

const eslintMapping: Record<string, MappingEntry> = {};

type Directive = {
  parentDirective: {
    node: estree.Comment;
    value: string;
    ruleIds: string[];
  };
  type: 'disable' | 'enable' | 'disable-line' | 'disable-next-line';
  line: number;
  column: number;
  ruleId: string | null;
  justification: string;
};

for (const [sonarKey, rawMeta] of Object.entries(ruleMetas)) {
  const meta = rawMeta as SonarMeta;
  const ruleId = `sonarjs/${sonarKey}`;
  const ruleModule = sonarRules[sonarKey];
  registerRuleAlias(sonarKey, ruleId, ruleModule);
  registerRuleAlias(
    meta.eslintId,
    ruleId,
    meta.externalPlugin
      ? getExternalRuleDefinition(meta.externalPlugin, meta.eslintId)
      : ruleModule,
  );
  if (meta.implementation === 'decorated') {
    for (const externalRule of meta.externalRules ?? []) {
      registerRuleAlias(
        externalRule.externalRule,
        ruleId,
        getExternalRuleDefinition(externalRule.externalPlugin, externalRule.externalRule),
      );
    }
  }
}

function registerRuleAlias(
  alias: string,
  ruleId: string,
  directiveRuleDefinition?: Rule.RuleModule,
) {
  if (directiveRuleDefinition) {
    eslintMapping[alias] = { ruleId, directiveRuleDefinition };
  }
}

function normalizeInlineRuleOptions(
  options: Linter.RuleEntry,
  directiveRuleDefinition: Rule.RuleModule,
): Linter.RuleEntry {
  if (!Array.isArray(options) || options.length === 0) {
    return options;
  }

  const [severity, ...ruleOptions] = options;
  const defaultOptions = directiveRuleDefinition.meta?.defaultOptions;
  if (!defaultOptions?.length) {
    return options;
  }

  return [severity, ...merge([], defaultOptions, ruleOptions)];
}

/**
 * Extracts the rule part from a ruleId containing plugin and rule parts.
 * @param ruleId The rule ID to parse.
 * @returns string The rule part of the ruleId;
 */
function getRuleId(ruleId: string | null) {
  return ruleId?.split('/').at(-1)!;
}

export function createOptions(filename: NormalizedAbsolutePath): Linter.LintOptions & {
  getRule: (ruleId: string) => Rule.RuleModule | undefined;
  patchDirectives: (disableDirectives: Directive[]) => void;
  patchInlineOptions: (config: { rules: Linter.RulesRecord }) => void;
} {
  const mappedParentDirectives = new Set();

  return {
    filename,
    allowInlineConfig: true,
    // ESLint resolves directive comments before our runtime rule id remap happens. For aliases
    // such as `prefer-const`, we therefore expose the rule definition that matches the alias
    // seen in the file, while `patchInlineOptions` and `patchDirectives` later remap everything
    // back onto the internal `sonarjs/Sxxxx` rule id that we actually execute.
    getRule: (ruleId: string) => eslintMapping[getRuleId(ruleId)]?.directiveRuleDefinition,
    patchDirectives: (disableDirectives: Directive[]) => {
      for (const directive of disableDirectives) {
        if (!eslintMapping[getRuleId(directive.ruleId)]) {
          continue;
        }
        directive.ruleId = eslintMapping[getRuleId(directive.ruleId)].ruleId;
        if (!mappedParentDirectives.has(directive.parentDirective)) {
          directive.parentDirective.ruleIds = directive.parentDirective.ruleIds.map(ruleId => {
            const mappedRule = ruleId && eslintMapping[getRuleId(ruleId)];
            if (mappedRule) {
              directive.parentDirective.value = directive.parentDirective.value.replaceAll(
                ruleId,
                mappedRule.ruleId,
              );
              return mappedRule.ruleId;
            }
            return ruleId;
          });
          mappedParentDirectives.add(directive.parentDirective);
        }
      }
    },
    patchInlineOptions: (config: { rules: Linter.RulesRecord }) => {
      const patchedOptions: Linter.RulesRecord = {};
      for (const [ruleId, options] of Object.entries(config.rules)) {
        const mapping = eslintMapping[getRuleId(ruleId)];
        if (mapping) {
          // ESLint has already parsed the inline directive at this point, but once we remap the
          // rule id we must reapply the defaults for the alias used in the file. Otherwise a
          // severity-only pragma such as `/* eslint prefer-const: 2 */` drops the option object
          // that external rules expect and can crash during rule creation.
          patchedOptions[mapping.ruleId] = normalizeInlineRuleOptions(
            options,
            mapping.directiveRuleDefinition,
          );
        }
      }
      config.rules = patchedOptions;
    },
  };
}
