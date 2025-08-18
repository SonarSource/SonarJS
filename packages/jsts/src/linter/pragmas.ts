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

import { Linter, Rule } from 'eslint';
import type estree from 'estree';
import { customRules as internalCustomRules } from './custom-rules/rules.js';
import * as ruleMetas from '../rules/metas.js';
import * as rules from '../rules/rules.js';

const eslintMapping: { [key: string]: { ruleId: string; ruleModule: Rule.RuleModule } } = {};

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

internalCustomRules.forEach(rule => {
  eslintMapping[rule.ruleId] = { ruleId: `sonarjs/${rule.ruleId}`, ruleModule: rule.ruleModule };
});

Object.entries(ruleMetas).forEach(([sonarKey, meta]) => {
  const ruleId = `sonarjs/${sonarKey}`;
  const ruleModule = rules[sonarKey as keyof typeof rules];
  eslintMapping[sonarKey] = { ruleId, ruleModule };
  eslintMapping[meta.eslintId] = { ruleId, ruleModule };
  if (meta.implementation === 'decorated') {
    meta.externalRules.forEach(externalRule => {
      eslintMapping[externalRule.externalRule] = { ruleId, ruleModule };
    });
  }
});

/**
 * Extracts the rule part from a ruleId containing plugin and rule parts.
 * @param ruleId The rule ID to parse.
 * @returns string The rule part of the ruleId;
 */
function getRuleId(ruleId: string | null) {
  return ruleId?.split('/').at(-1)!;
}

export function createOptions(filename: string) {
  const mappedParentDirectives = new Set();

  return {
    filename,
    allowInlineConfig: true,
    getRule: (ruleId: string) => eslintMapping[getRuleId(ruleId)]?.ruleId,
    patchDirectives: (disableDirectives: Directive[]) =>
      disableDirectives.forEach(directive => {
        if (!eslintMapping[getRuleId(directive.ruleId)]) {
          return;
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
      }),
    patchInlineOptions: (config: { rules: Linter.RulesRecord }) => {
      const patchedOptions: Linter.RulesRecord = {};
      for (const [ruleId, options] of Object.entries(config.rules)) {
        const sonarKey = eslintMapping[getRuleId(ruleId)]?.ruleId;
        if (sonarKey) {
          patchedOptions[sonarKey] = options;
        }
      }
      config.rules = patchedOptions;
    },
  };
}
