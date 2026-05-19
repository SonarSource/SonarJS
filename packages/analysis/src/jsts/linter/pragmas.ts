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
import { SourceCode as ESLintSourceCode, type Linter, type Rule, type SourceCode } from 'eslint';
import type estree from 'estree';
import * as ruleMetas from '../rules/metas.js';
import * as rules from '../rules/rules.js';
import { getExternalRuleDefinition } from '../rules/external/registry.js';
import type { SonarMeta } from '../rules/helpers/generate-meta.js';
import type { NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { materializeRuleOptions, mergeRuleOptions } from '../rules/helpers/configs.js';

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
    (meta.externalPlugin ? getExternalRuleDefinition(meta.externalPlugin, meta.eslintId) : ruleModule) ??
      ruleModule,
  );
  if (meta.externalPlugin) {
    registerRuleAlias(
      getScopedExternalRuleId(meta.externalPlugin, meta.eslintId),
      ruleId,
      getExternalRuleDefinition(meta.externalPlugin, meta.eslintId) ?? ruleModule,
    );
  }
  if (meta.implementation === 'decorated') {
    for (const externalRule of meta.externalRules ?? []) {
      registerRuleAlias(
        externalRule.externalRule,
        ruleId,
        getExternalRuleDefinition(externalRule.externalPlugin, externalRule.externalRule) ?? ruleModule,
      );
      registerRuleAlias(
        getScopedExternalRuleId(externalRule.externalPlugin, externalRule.externalRule),
        ruleId,
        getExternalRuleDefinition(externalRule.externalPlugin, externalRule.externalRule) ?? ruleModule,
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

function getScopedExternalRuleId(externalPlugin: string, externalRule: string): string {
  return `${externalPlugin === 'typescript-eslint' ? '@typescript-eslint' : externalPlugin}/${externalRule}`;
}

function normalizeInlineRuleOptions(
  options: Linter.RuleEntry,
  mapping: MappingEntry,
  activeRuleOptions?: Linter.RuleEntry,
): Linter.RuleEntry {
  if (Array.isArray(options) && options.length === 0) {
    return options;
  }

  const [severity, ...ruleOptions] = Array.isArray(options) ? options : [options];
  const defaultOptions = getInlineRuleDefaultOptions(mapping, activeRuleOptions);
  const mergedOptions = mergeRuleOptions(defaultOptions, ruleOptions);

  return mergedOptions.length > 0 ? [severity, ...mergedOptions] : severity;
}

function getInlineRuleDefaultOptions(
  mapping: MappingEntry,
  activeRuleOptions?: Linter.RuleEntry,
): unknown[] {
  if (Array.isArray(activeRuleOptions)) {
    return activeRuleOptions.slice(1);
  }

  return materializeRuleOptions(getSonarMeta(mapping.ruleId), mapping.directiveRuleDefinition);
}

/**
 * Extracts the rule part from a ruleId containing plugin and rule parts.
 * @param ruleId The rule ID to parse.
 * @returns string The rule part of the ruleId;
 */
function getRuleId(ruleId: string | null) {
  return ruleId?.split('/').at(-1)!;
}

export function patchSourceCodeComments(sourceCode: SourceCode): SourceCode {
  const patchedSourceCode = new ESLintSourceCode({
    text: sourceCode.text,
    ast: sourceCode.ast,
    hasBOM: sourceCode.hasBOM,
    parserServices: sourceCode.parserServices,
    visitorKeys: sourceCode.visitorKeys,
    scopeManager: sourceCode.scopeManager,
  });

  for (const comment of patchedSourceCode.getAllComments()) {
    if (!comment.value.includes('eslint')) {
      continue;
    }
    comment.value = replaceRuleAliases(comment.value);
  }
  return patchedSourceCode;
}

export function filterMessagesSuppressedByRuleAlias(
  sourceCode: SourceCode,
  messages: Linter.LintMessage[],
): Linter.LintMessage[] {
  return messages.filter(message => {
    if (!message.ruleId?.startsWith('sonarjs/')) {
      return true;
    }
    const sonarKey = message.ruleId.slice('sonarjs/'.length);
    const aliases = getRuleAliases(sonarKey);
    if (aliases.length === 0) {
      return true;
    }
    const lines = sourceCode.getLines();
    const sameLineComment = lines[message.line - 1] ?? '';
    const previousLineComment = lines[message.line - 2] ?? '';
    return !(
      disablesRuleAlias(sameLineComment, 'eslint-disable-line', aliases) ||
      disablesRuleAlias(previousLineComment, 'eslint-disable-next-line', aliases)
    );
  });
}

function getRuleAliases(sonarKey: string): string[] {
  const ruleMeta = ruleMetas[sonarKey as keyof typeof ruleMetas] as SonarMeta | undefined;
  if (!ruleMeta) {
    return [];
  }
  const aliases = [ruleMeta.eslintId, `sonarjs/${ruleMeta.eslintId}`];
  if (ruleMeta.externalPlugin) {
    const scopedExternalRuleId = getScopedExternalRuleId(ruleMeta.externalPlugin, ruleMeta.eslintId);
    aliases.push(scopedExternalRuleId, `sonarjs/${scopedExternalRuleId}`);
  }
  if (ruleMeta.implementation === 'decorated') {
    for (const externalRule of ruleMeta.externalRules ?? []) {
      const scopedExternalRuleId = getScopedExternalRuleId(
        externalRule.externalPlugin,
        externalRule.externalRule,
      );
      aliases.push(externalRule.externalRule);
      aliases.push(`sonarjs/${externalRule.externalRule}`);
      aliases.push(scopedExternalRuleId);
      aliases.push(`sonarjs/${scopedExternalRuleId}`);
    }
  }
  return aliases;
}

function disablesRuleAlias(line: string, directive: string, aliases: string[]): boolean {
  if (!line.includes(directive)) {
    return false;
  }
  return aliases.some(alias => line.includes(alias));
}

function replaceRuleAliases(value: string): string {
  let patchedValue = value;
  for (const [alias, mapping] of Object.entries(eslintMapping)) {
    const defaultOptions = mapping.directiveRuleDefinition.meta?.defaultOptions;
    if (!defaultOptions?.length) {
      continue;
    }
    patchedValue = patchedValue.replace(
      new RegExp(`(?<![/\\w@-])${escapeRegExp(alias)}\\s*:\\s*([012]|error|warn|off)\\b`, 'g'),
      `${mapping.ruleId}: [$1, ${defaultOptions.map(option => JSON.stringify(option)).join(', ')}]`,
    );
  }
  return patchedValue.replaceAll(/(?:@[\w-]+\/)?[\w-]+\/[\w-]+|\b[\w-]+\b/g, ruleId => {
    const sonarJsAlias = ruleId.startsWith('sonarjs/') ? ruleId.slice('sonarjs/'.length) : undefined;
    if (sonarJsAlias && /^S\d+$/.test(sonarJsAlias)) {
      return ruleId;
    }
    const mappedRule =
      eslintMapping[ruleId] ??
      (sonarJsAlias ? eslintMapping[sonarJsAlias] : undefined) ??
      eslintMapping[getRuleId(ruleId)];
    return mappedRule ? mappedRule.ruleId : ruleId;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createOptions(
  filename: NormalizedAbsolutePath,
  activeRules: Linter.RulesRecord,
): Linter.LintOptions & {
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
      const patchedOptions: Linter.RulesRecord = { ...config.rules };
      const aliasedRuleIds = new Set<string>();

      for (const [ruleId, options] of Object.entries(config.rules)) {
        const mapping = eslintMapping[getRuleId(ruleId)];
        if (mapping && ruleId !== mapping.ruleId) {
          // ESLint has already parsed the inline directive at this point, but once we remap the
          // rule id we must reapply the active Sonar/materialized options for that rule. Otherwise
          // severity-only pragmas drop Sonar defaults, and inline overrides merge against raw
          // upstream alias defaults instead of the effective runtime config.
          patchedOptions[mapping.ruleId] = normalizeInlineRuleOptions(
            options,
            mapping,
            activeRules[mapping.ruleId],
          );
          delete patchedOptions[ruleId];
          aliasedRuleIds.add(mapping.ruleId);
        }
      }

      for (const [ruleId, options] of Object.entries(config.rules)) {
        const mapping = eslintMapping[getRuleId(ruleId)];
        if (ruleId === mapping?.ruleId && !aliasedRuleIds.has(ruleId)) {
          patchedOptions[ruleId] = normalizeInlineRuleOptions(
            options,
            mapping,
            activeRules[ruleId],
          );
        }
      }
      config.rules = patchedOptions;
    },
  };
}

function getSonarMeta(ruleId: string): SonarMeta | undefined {
  const sonarKey = getRuleId(ruleId);
  return sonarKey in ruleMetas
    ? (ruleMetas[sonarKey as keyof typeof ruleMetas] as SonarMeta)
    : undefined;
}
