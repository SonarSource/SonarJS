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
import { Issue } from './issue.js';
import type { EncodedMessage, SonarMeta } from '../../rules/helpers/index.js';

/**
 * Decodes an issue with secondary locations, if any.
 * Otherwise, the original issue is returned unchanged.
 *
 * @param sonarMeta the rule definition
 * @param issue the issue to decode
 * @throws a runtime error in case of an invalid encoding
 * @returns the decoded issue (or the original one)
 */
export function decodeSecondaryLocations(sonarMeta: SonarMeta | undefined, issue: Issue): Issue {
  if (sonarMeta?.hasSecondaries) {
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
