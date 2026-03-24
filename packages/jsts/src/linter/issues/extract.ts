/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type { Linter } from 'eslint';
import { rule as cognitiveComplexityRule } from '../custom-rules/cognitive-complexity.js';

const INTERNAL_COGNITIVE_COMPLEXITY_RULE_ID = `sonarjs/${cognitiveComplexityRule.ruleId}`;

/**
 * Extracts analysis data produced by internal custom rules.
 *
 * Internal rules encode file-level data in ESLint messages. We extract the first
 * occurrence of each internal metric message and remove those messages from the
 * returned list, so regular message transformation remains issue-only.
 *
 * @param messages ESLint messages to process
 * @returns filtered messages and extracted metrics
 */
export function extractInternalMetrics(messages: Linter.LintMessage[]): {
  messages: Linter.LintMessage[];
  cognitiveComplexity?: number;
} {
  const filteredMessages: Linter.LintMessage[] = [];
  let cognitiveComplexity: number | undefined;
  let foundCognitiveComplexity = false;

  for (const message of messages) {
    if (message.ruleId === INTERNAL_COGNITIVE_COMPLEXITY_RULE_ID && !foundCognitiveComplexity) {
      const parsed = Number(message.message);
      cognitiveComplexity = Number.isNaN(parsed) ? undefined : parsed;
      foundCognitiveComplexity = true;
      continue;
    }

    filteredMessages.push(message);
  }

  return { messages: filteredMessages, cognitiveComplexity };
}
