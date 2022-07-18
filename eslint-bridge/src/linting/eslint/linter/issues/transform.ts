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

import { Linter, Rule, SourceCode } from 'eslint';
import { decodeSonarRuntime } from './decode';
import { Issue } from './issue';
import { normalizeLocation } from './normalize';
import { convertMessage } from './message';

/**
 * Transforms ESLint messages into SonarQube issues
 *
 * Transforming an ESLint message into a SonarQube issue implies:
 * - converting ESLint messages into SonarQube issues
 * - converting ESLint fixes into SonarLint quick fixes
 * - decoding encoded secondary locations
 * - normalizing issue locations
 *
 * @param messages ESLint messages to transform
 * @param ctx contextual information
 * @returns the transformed issues
 */
export function transformMessages(
  messages: Linter.LintMessage[],
  ctx: { sourceCode: SourceCode; rules: Map<string, Rule.RuleModule> },
): Issue[] {
  return messages
    .map(message => convertMessage(ctx.sourceCode, message))
    .map(issue => (issue ? decodeSonarRuntime(ctx.rules.get(issue.ruleId), issue) : null))
    .filter((issue): issue is Issue => issue !== null)
    .map(normalizeLocation);
}
