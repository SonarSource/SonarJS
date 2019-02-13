/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import { rules as externalRules } from "eslint-plugin-sonarjs";
import { rules as internalRules } from "./rules/main";
import { Linter, SourceCode, Rule as ESLintRule } from "eslint";
import { Rule, Issue, IssueLocation } from "./analyzer";

interface EncodedMessage {
  message: string;
  cost?: number;
  secondaryLocations: IssueLocation[];
}

const linter = new Linter();
linter.defineRules(externalRules);
linter.defineRules(internalRules);

export function analyze(sourceCode: SourceCode, inputRules: Rule[], fileUri: string): Issue[] {
  return linter
    .verify(sourceCode, createLinterConfig(inputRules), fileUri)
    .map(removeIrrelevantProperties)
    .map(issue => {
      if (!issue) {
        return null;
      }
      return decodeSecondaryLocations(linter.getRules().get(issue.ruleId), issue);
    })
    .filter((issue): issue is Issue => issue !== null);
}

// exported for testing
export function decodeSecondaryLocations(
  ruleModule: ESLintRule.RuleModule | undefined,
  issue: Issue,
): Issue | null {
  if (hasSonarRuntimeOption(ruleModule)) {
    try {
      const encodedMessage: EncodedMessage = JSON.parse(issue.message);
      return { ...issue, ...encodedMessage };
    } catch (e) {
      console.error(
        `Failed to parse issue message containing secondary locations for rule ${issue.ruleId}`,
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

  const { nodeType, severity, fatal, fix, source, ruleId, ...relevantProperties } = eslintIssue;
  return { ...relevantProperties, ruleId, secondaryLocations: [] };
}

function createLinterConfig(inputRules: Rule[]) {
  const ruleConfig: Linter.Config = { rules: {}, parserOptions: { sourceType: "module" } };
  inputRules.forEach(inputRule => {
    const ruleModule = linter.getRules().get(inputRule.key);
    ruleConfig.rules![inputRule.key] = ["error", ...getRuleConfig(ruleModule, inputRule)];
  });
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
  if (hasSonarRuntimeOption(ruleModule)) {
    return options.concat("sonar-runtime");
  }
  return options;
}

function hasSonarRuntimeOption(ruleModule: ESLintRule.RuleModule | undefined) {
  if (!ruleModule || !ruleModule.meta || !ruleModule.meta.schema) {
    return false;
  }
  const { schema } = ruleModule.meta;
  const props = Array.isArray(schema) ? schema : [schema];
  return props.some(option => !!option.enum && option.enum.includes("sonar-runtime"));
}
