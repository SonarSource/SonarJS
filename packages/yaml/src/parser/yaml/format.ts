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
/**
 * YAML string formats given by the YAML parser
 */
export const [PLAIN_FORMAT, BLOCK_FOLDED_FORMAT, BLOCK_LITERAL_FORMAT] = [
  'PLAIN',
  'BLOCK_FOLDED',
  'BLOCK_LITERAL',
];

/**
 * The list of supported YAML string formats
 */
export const SUPPORTED_STRING_FORMATS = [PLAIN_FORMAT, BLOCK_FOLDED_FORMAT, BLOCK_LITERAL_FORMAT];

/**
 * Checks if the node denotes a supported YAML string format
 */
export function isSupportedFormat(pair: any) {
  return SUPPORTED_STRING_FORMATS.includes(pair.value?.type);
}
