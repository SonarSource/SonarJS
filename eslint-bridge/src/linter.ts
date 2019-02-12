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
import { Rule, Issue } from "./analyzer";

type RuleDefinitions = {
  [key: string]: ESLintRule.RuleModule;
};

const linter = new Linter();
const ruleDefinitions: RuleDefinitions = { ...externalRules, ...internalRules };

linter.defineRules(ruleDefinitions);

export function analyze(sourceCode: SourceCode, inputRules: Rule[], fileUri: string): Issue[] {
  return linter
    .verify(sourceCode, createLinterConfig(ruleDefinitions, inputRules), fileUri)
    .map(removeIrrelevantProperties)
    .filter(issue => issue !== null) as Issue[];
}

function removeIrrelevantProperties(eslintIssue: Linter.LintMessage): Issue | null {
  // ruleId equals 'null' for parsing error,
  // but it should not happen because we lint ready AST and not file content
  if (!eslintIssue.ruleId) {
    console.error("Illegal 'null' ruleId for eslint issue");
    return null;
  }

  const { nodeType, severity, fatal, fix, source, ...relevantProperties } = eslintIssue;
  return relevantProperties as Issue;
}

// exported for unit testing
export function createLinterConfig(ruleDefinitions: RuleDefinitions, inputRules: Rule[]) {
  const ruleConfig: Linter.Config = { rules: {}, parserOptions: { sourceType: "module" } };
  inputRules.forEach(rule => {
    const options = rule.configurations;
    if (hasSonarRuntimeOption(ruleDefinitions, rule.key)) {
      // 'sonar-runtime' always added in last position
      options.push("sonar-runtime");
    }
    ruleConfig.rules![rule.key] = ["error", ...options];
  });
  return ruleConfig;
}

/**
 * 'sonar-runtime' is the option used by eslint-plugin-sonarjs rules to distinguish
 *  when they are executed in a sonar* context or in eslint
 */
function hasSonarRuntimeOption(ruleMap: RuleDefinitions, ruleKey: string) {
  const rule = ruleMap[ruleKey];
  if (!rule || !rule.meta || !rule.meta.schema) {
    return false;
  }
  const { schema } = rule.meta;
  const props = Array.isArray(schema) ? schema : [schema];
  return props.some(option => !!option.enum && option.enum.includes("sonar-runtime"));
}
