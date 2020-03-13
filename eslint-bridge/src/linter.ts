/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { rules as chaiFriendlyRules } from 'eslint-plugin-chai-friendly';
import { rules as internalRules } from './rules/main';
import { Linter, SourceCode, Rule as ESLintRule } from 'eslint';
import { Rule, Issue, IssueLocation } from './analyzer';

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
}

const linter = new Linter();
linter.defineRules(sonarjsRules);
linter.defineRules(internalRules);

try {
  // we load "@typescript-eslint/eslint-plugin" dynamically as it requires TS and so we don't need typescript dependency when analysing pure JS project
  const typescriptEslintRules = require('@typescript-eslint/eslint-plugin').rules;
  // TS implementation of no-throw-literal is not supporting JS code.
  delete typescriptEslintRules['no-throw-literal'];
  linter.defineRules(typescriptEslintRules);
} catch {
  // do nothing, "typescript" is not there
}

// core implementation of this rule raises FPs on chai framework
linter.defineRule('no-unused-expressions', chaiFriendlyRules['no-unused-expressions']);

/**
 * 'additionalRules' - rules used for computing metrics (incl. highlighting) when it requires access to the rule context; resulting value is encoded in the message
 */
export function analyze(
  sourceCode: SourceCode,
  filePath: string,
  inputRules: Rule[],
  ...additionalRules: AdditionalRule[]
) {
  additionalRules.forEach(additionalRule =>
    linter.defineRule(additionalRule.ruleId, additionalRule.ruleModule),
  );

  const issues = linter
    .verify(sourceCode, createLinterConfig(inputRules, additionalRules), {
      filename: filePath,
      allowInlineConfig: false,
    })
    .map(removeIrrelevantProperties)
    .map(issue => {
      if (!issue) {
        return null;
      }
      return decodeSonarRuntimeIssue(linter.getRules().get(issue.ruleId), issue);
    })
    .filter((issue): issue is Issue => issue !== null)
    .map(normalizeIssueLocation);
  return { issues };
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
      console.error(
        `Failed to parse encoded issue message for rule ${issue.ruleId}:\n"${issue.message}"`,
        e,
      );
      return null;
    }
  }
  return issue;
}

function removeIrrelevantProperties(eslintIssue: Linter.LintMessage): Issue | null {
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
    secondaryLocations: [],
  };
}

function createLinterConfig(
  inputRules: Rule[],
  additionalRules: { ruleId: string; ruleModule: ESLintRule.RuleModule; ruleConfig: any[] }[],
) {
  const ruleConfig: Linter.Config = {
    rules: {},
    parserOptions: { sourceType: 'module', ecmaVersion: 2018 },
  };
  inputRules.forEach(inputRule => {
    const ruleModule = linter.getRules().get(inputRule.key);
    ruleConfig.rules![inputRule.key] = ['error', ...getRuleConfig(ruleModule, inputRule)];
  });

  additionalRules.forEach(
    additionalRule =>
      (ruleConfig.rules![additionalRule.ruleId] = ['error', ...additionalRule.ruleConfig]),
  );
  return ruleConfig;
}

/**
 * 'sonar-runtime' is the option used by eslint-plugin-sonarjs rules to distinguish
 *  when they are executed in a sonar* context or in eslint
 *
 * exported for testing
 */
export function getRuleConfig(ruleModule: ESLintRule.RuleModule | undefined, inputRule: Rule) {
  const options = inputRule.configurations;
  if (hasSonarRuntimeOption(ruleModule, inputRule.key)) {
    return options.concat('sonar-runtime');
  }
  return options;
}

function hasSonarRuntimeOption(ruleModule: ESLintRule.RuleModule | undefined, ruleId: string) {
  if (!ruleModule) {
    console.log(`DEBUG ruleModule not found for rule ${ruleId}`);
    return false;
  }
  if (!ruleModule.meta || !ruleModule.meta.schema) {
    return false;
  }
  const { schema } = ruleModule.meta;
  const props = Array.isArray(schema) ? schema : [schema];
  return props.some(option => !!option.enum && option.enum.includes('sonar-runtime'));
}

function normalizeIssueLocation(issue: Issue) {
  issue.column -= 1;
  if (issue.endColumn) {
    issue.endColumn -= 1;
  }
  return issue;
}
