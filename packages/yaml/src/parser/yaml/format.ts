/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
