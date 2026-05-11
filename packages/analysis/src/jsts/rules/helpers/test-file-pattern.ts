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

export const TEST_FILE_PATTERN = /\.(?:test|spec|cy)\.[cm]?[jt]sx?$/;

// Matches "test-related files" — superset of TEST_FILE_PATTERN that also covers e2e/mock suffixes and __tests__/ / __mocks__/ directories.
export const TEST_RELATED_FILE_PATTERN = new RegExp(
  String.raw`${TEST_FILE_PATTERN.source}|\.(?:e2e|mock)\.[cm]?[jt]sx?$|[\\/](?:__tests__|__mocks__)[\\/]`,
);
