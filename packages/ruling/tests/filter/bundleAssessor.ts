/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
const READ_CHARACTERS_LIMIT = 2048;
const COMMENT_OPERATOR_FUNCTION = buildBundleRegex();

export function bundleAssessor(input: string) {
  const firstCharacters = input.substring(0, READ_CHARACTERS_LIMIT);
  return !COMMENT_OPERATOR_FUNCTION.test(firstCharacters);
}

function buildBundleRegex() {
  const COMMENT = '/\\*.*\\*/';
  const OPERATOR = '[!;+(]';
  const OPTIONAL_FUNCTION_NAME = '(?: [_$a-zA-Z][_$a-zA-Z0-9]*)?';

  return new RegExp(
    COMMENT + '\\s*' + OPERATOR + 'function ?' + OPTIONAL_FUNCTION_NAME + '\\(',
    's',
  );
}
