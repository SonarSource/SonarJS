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
import { rules } from "eslint-plugin-sonarjs";
import { Linter, SourceCode } from "eslint";
import { Rule, Issue } from "./analyzer";

const linter = new Linter();
linter.defineRules(rules);

export function analyze(sourceCode: SourceCode, rules: Rule[], fileUri: string): Issue[] {
  return linter
    .verify(sourceCode, createLinterConfig(rules), fileUri)
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

function createLinterConfig(rules: Rule[]) {
  const ruleConfig: Linter.Config = { rules: {}, parserOptions: { sourceType: "module" } };
  rules.forEach(rule => (ruleConfig.rules![rule] = "error"));
  return ruleConfig;
}
