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

const COGNITIVE_COMPLEXITY_RULE_ID = 'sonarjs/S3776';
const COGNITIVE_COMPLEXITY_MESSAGE_ID = 'fileComplexity';

/**
 * Extracts analysis data produced by internal metric messages.
 *
 * S3776 encodes file-level cognitive complexity in a dedicated ESLint message.
 * We extract the first metric message and remove it from the returned list, so
 * regular message transformation remains issue-only.
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
  let foundCognitiveComplexityMetric = false;

  for (const message of messages) {
    if (isCognitiveComplexityMetric(message) && !foundCognitiveComplexityMetric) {
      const parsed = Number(message.message);
      cognitiveComplexity = Number.isNaN(parsed) ? undefined : parsed;
      foundCognitiveComplexityMetric = true;
      continue;
    }

    filteredMessages.push(message);
  }

  return { messages: filteredMessages, cognitiveComplexity };
}

function isCognitiveComplexityMetric(message: Linter.LintMessage) {
  return (
    message.ruleId === COGNITIVE_COMPLEXITY_RULE_ID &&
    message.messageId === COGNITIVE_COMPLEXITY_MESSAGE_ID
  );
}
