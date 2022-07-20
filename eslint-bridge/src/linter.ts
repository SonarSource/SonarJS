/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { rules as sonarjsRules } from 'eslint-plugin-sonarjs';
import { rules as reactRules } from 'eslint-plugin-react';
import { rules as chaiFriendlyRules } from 'eslint-plugin-chai-friendly';
import {
  decorateJavascriptEslint,
  decorateTypescriptEslint,
} from './rules/no-unused-expressions-decorator';
import { rules as internalRules } from './rules/main';
import { Linter, Rule as ESLintRule, SourceCode } from 'eslint';
import { FileType, Issue, IssueLocation, Rule } from './analyzer';
import {
  rule as symbolHighlightingRule,
  symbolHighlightingRuleId,
} from './runner/symbol-highlighter';
import { rules as typescriptEslintRules } from '@typescript-eslint/eslint-plugin';
import { getContext } from './context';
import { getQuickFixes } from './quickfix';
import { externalRuleDecorators } from './rules/decorators';

const COGNITIVE_COMPLEXITY_RULE_ID = 'internal-cognitive-complexity';

export const SYMBOL_HIGHLIGHTING_RULE: AdditionalRule = {
  ruleId: symbolHighlightingRuleId,
  ruleModule: symbolHighlightingRule,
  ruleConfig: [],
};

export const COGNITIVE_COMPLEXITY_RULE: AdditionalRule = {
  ruleId: COGNITIVE_COMPLEXITY_RULE_ID,
  ruleModule: sonarjsRules['cognitive-complexity'],
  ruleConfig: ['metric'],
};

/**
 * In order to overcome ESLint limitation regarding issue reporting,
 * ESLint-based rules send extra information by serializing in the issue message an object
 * having the following structure
 */
interface EncodedMessage {
  message: string;
  cost?: number;
  secondaryLocations: IssueLocation[];
}

export interface AdditionalRule {
  ruleId: string;
  ruleModule: ESLintRule.RuleModule;
  ruleConfig: any[];
  // should this rule be always activated regardless quality profile? used for highlighting and metrics
  activateAutomatically?: boolean;
}

export class LinterWrapper {
  linter: Linter;
  linterConfig: Linter.Config;
  testLinterConfig: Linter.Config;
  rules: Map<string, ESLintRule.RuleModule>;

  /**
   * 'customRules' - rules provided by additional rule bundles
   */
  constructor(
    inputRules: Rule[],
    customRules: AdditionalRule[] = [],
    environments: string[] = [],
    globals: string[] = [],
  ) {
    this.linter = new Linter();
    this.linter.defineRules(sonarjsRules);
    this.linter.defineRules(internalRules);
    this.linter.defineRules(reactRules);

    const NO_UNUSED_EXPRESSIONS = 'no-unused-expressions';

    // core implementation of this rule raises FPs on chai framework
    this.linter.defineRule(
      NO_UNUSED_EXPRESSIONS,
      decorateJavascriptEslint(chaiFriendlyRules[NO_UNUSED_EXPRESSIONS]),
    );

    // S1537 and S3723 both depend on the same eslint implementation
    // but the plugin doesn't allow duplicates of the same key.
    this.linter.defineRule('enforce-trailing-comma', this.linter.getRules().get('comma-dangle')!);

    // TS implementation of no-throw-literal is not supporting JS code.
    delete typescriptEslintRules['no-throw-literal'];
    Object.keys(typescriptEslintRules).forEach(name => {
      typescriptEslintRules[name] = sanitizeTypeScriptESLintRule(typescriptEslintRules[name]);
    });
    this.linter.defineRules(typescriptEslintRules);

    const noUnusedExpressionsRule = typescriptEslintRules[NO_UNUSED_EXPRESSIONS];
    if (noUnusedExpressionsRule) {
      this.linter.defineRule(
        NO_UNUSED_EXPRESSIONS,
        decorateTypescriptEslint(noUnusedExpressionsRule),
      );
    }

    externalRuleDecorators.forEach(externalRuleDecorator => {
      this.linter.defineRule(
        externalRuleDecorator.ruleKey,
        externalRuleDecorator.decorate(this.linter.getRules().get(externalRuleDecorator.ruleKey)!),
      );
    });

    customRules.forEach(r => this.linter.defineRule(r.ruleId, r.ruleModule));
    this.linter.defineRule(COGNITIVE_COMPLEXITY_RULE.ruleId, COGNITIVE_COMPLEXITY_RULE.ruleModule);
    this.linter.defineRule(SYMBOL_HIGHLIGHTING_RULE.ruleId, SYMBOL_HIGHLIGHTING_RULE.ruleModule);

    this.rules = this.linter.getRules();

    const inputRulesMain: Rule[] = [],
      inputRulesTest: Rule[] = [];
    inputRules.forEach(r => {
      if (r.fileTypeTarget.includes('MAIN')) {
        inputRulesMain.push(r);
      }
      if (r.fileTypeTarget.includes('TEST')) {
        inputRulesTest.push(r);
      }
    });
    this.linterConfig = this.createLinterConfig(inputRulesMain, environments, globals);
    this.testLinterConfig = this.createLinterConfig(inputRulesTest, environments, globals);
  }

  createLinterConfig(inputRules: Rule[], environments: string[], globals: string[]) {
    const env: { [name: string]: boolean } = { es6: true };
    const globalsConfig: { [name: string]: boolean } = {};
    for (const key of environments) {
      env[key] = true;
    }
    for (const key of globals) {
      globalsConfig[key] = true;
    }
    const ruleConfig: Linter.Config = {
      rules: {},
      parserOptions: { sourceType: 'module', ecmaVersion: 2018 },
      env,
      globals: globalsConfig,
      // using "max" version to prevent eslint-plugin-react from printing a warning
      settings: { react: { version: '999.999.999' } },
    };
    inputRules.forEach(inputRule => {
      const ruleModule = this.rules.get(inputRule.key);
      ruleConfig.rules![inputRule.key] = ['error', ...getRuleConfig(ruleModule, inputRule)];
    });

    if (!getContext().sonarlint) {
      [COGNITIVE_COMPLEXITY_RULE, SYMBOL_HIGHLIGHTING_RULE].forEach(
        r => (ruleConfig.rules![r.ruleId] = ['error', ...r.ruleConfig]),
      );
    }
    return ruleConfig;
  }

  analyze(sourceCode: SourceCode, filePath: string, fileType?: FileType) {
    const config = fileType === 'TEST' ? this.testLinterConfig : this.linterConfig;
    const issues = this.linter
      .verify(
        sourceCode,
        { ...config, settings: { ...config.settings, fileType } },
        {
          filename: filePath,
          allowInlineConfig: false,
        },
      )
      .map(eslintIssue => processLintMessage(sourceCode, eslintIssue))
      .map(issue => {
        if (!issue) {
          return null;
        }
        return decodeSonarRuntimeIssue(this.rules.get(issue.ruleId), issue);
      })
      .filter((issue): issue is Issue => issue !== null)
      .map(normalizeIssueLocation);

    return {
      issues,
      highlightedSymbols: getHighlightedSymbols(issues),
      cognitiveComplexity: getCognitiveComplexity(issues),
    };
  }
}

// exported for testing
export function decodeSonarRuntimeIssue(
  ruleModule: ESLintRule.RuleModule | undefined,
  issue: Issue,
): Issue | null {
  if (hasSonarRuntimeOption(ruleModule, issue.ruleId)) {
    try {
      const encodedMessage: EncodedMessage = JSON.parse(issue.message);
      return { ...issue, ...encodedMessage };
    } catch (e) {
      throw new Error(
        `Failed to parse encoded issue message for rule ${issue.ruleId}:\n"${issue.message}". ${e.message}`,
      );
    }
  }
  return issue;
}

function sanitizeTypeScriptESLintRule(rule: ESLintRule.RuleModule): ESLintRule.RuleModule {
  return {
    ...(!!rule.meta && { meta: rule.meta }),
    create(originalContext: ESLintRule.RuleContext) {
      const interceptingContext: ESLintRule.RuleContext = {
        id: originalContext.id,
        options: originalContext.options,
        settings: originalContext.settings,
        parserPath: originalContext.parserPath,
        parserOptions: originalContext.parserOptions,
        parserServices: originalContext.parserServices,

        getCwd(): string {
          return originalContext.getCwd();
        },

        getPhysicalFilename(): string {
          return originalContext.getPhysicalFilename();
        },

        getAncestors() {
          return originalContext.getAncestors();
        },

        getDeclaredVariables(node: ESLintRule.Node) {
          return originalContext.getDeclaredVariables(node);
        },

        getFilename() {
          return originalContext.getFilename();
        },

        getScope() {
          return originalContext.getScope();
        },

        getSourceCode() {
          return originalContext.getSourceCode();
        },

        markVariableAsUsed(name: string) {
          return originalContext.markVariableAsUsed(name);
        },

        report(descriptor: ESLintRule.ReportDescriptor): void {
          return originalContext.report(descriptor);
        },
      };
      if (
        rule.meta?.docs &&
        (rule.meta.docs as any).requiresTypeChecking === true &&
        interceptingContext.parserServices.hasFullTypeInformation !== true
      ) {
        return {};
      }
      return rule.create(interceptingContext);
    },
  };
}

function processLintMessage(source: SourceCode, eslintIssue: Linter.LintMessage): Issue | null {
  // ruleId equals 'null' for parsing error,
  // but it should not happen because we lint ready AST and not file content
  if (!eslintIssue.ruleId) {
    console.error("Illegal 'null' ruleId for eslint issue");
    return null;
  }

  return {
    column: eslintIssue.column,
    line: eslintIssue.line,
    endColumn: eslintIssue.endColumn,
    endLine: eslintIssue.endLine,
    ruleId: eslintIssue.ruleId,
    message: eslintIssue.message,
    quickFixes: getQuickFixes(source, eslintIssue),
    secondaryLocations: [],
  };
}

/**
 * 'sonar-runtime' is the option used by eslint-plugin-sonarjs rules to distinguish
 *  when they are executed in a sonar* context or in eslint
 *
 *  'sonar-context' is the option to distinguish rules which require context as part of their options
 *
 * exported for testing
 */
export function getRuleConfig(ruleModule: ESLintRule.RuleModule | undefined, inputRule: Rule) {
  const options = [...inputRule.configurations];
  if (hasSonarRuntimeOption(ruleModule, inputRule.key)) {
    options.push('sonar-runtime');
  }
  if (hasSonarContextOption(ruleModule, inputRule.key)) {
    options.push(getContext());
  }
  return options;
}

function hasSonarRuntimeOption(
  ruleModule: ESLintRule.RuleModule | undefined,
  ruleId: string,
): boolean {
  const schema = getRuleSchema(ruleModule, ruleId);
  return !!schema && schema.some(option => !!option.enum && option.enum.includes('sonar-runtime'));
}

function hasSonarContextOption(
  ruleModule: ESLintRule.RuleModule | undefined,
  ruleId: string,
): boolean {
  const schema = getRuleSchema(ruleModule, ruleId);
  return !!schema && schema.some(option => option.title === 'sonar-context');
}

function getRuleSchema(ruleModule: ESLintRule.RuleModule | undefined, ruleId: string) {
  if (!ruleModule) {
    console.log(`DEBUG ruleModule not found for rule ${ruleId}`);
    return undefined;
  }
  if (!ruleModule.meta || !ruleModule.meta.schema) {
    return undefined;
  }
  const { schema } = ruleModule.meta;
  return Array.isArray(schema) ? schema : [schema];
}

function normalizeIssueLocation(issue: Issue) {
  issue.column -= 1;
  if (issue.endColumn) {
    issue.endColumn -= 1;
  }
  return issue;
}

// exported for testing
export function getHighlightedSymbols(issues: Issue[]) {
  const issue = findAndRemoveFirstIssue(issues, symbolHighlightingRuleId);
  if (issue) {
    return JSON.parse(issue.message);
  }
  return undefined;
}

// exported for testing
export function getCognitiveComplexity(issues: Issue[]) {
  const issue = findAndRemoveFirstIssue(issues, COGNITIVE_COMPLEXITY_RULE_ID);
  if (issue && !isNaN(Number(issue.message))) {
    return Number(issue.message);
  }
  return undefined;
}

function findAndRemoveFirstIssue(issues: Issue[], ruleId: string) {
  for (const issue of issues) {
    if (issue.ruleId === ruleId) {
      const index = issues.indexOf(issue);
      issues.splice(index, 1);
      return issue;
    }
  }
  return undefined;
}
