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
import * as path from 'path';

const HTML_EXTENSIONS = ['.html', '.htm'];
const YAML_EXTENSIONS = ['.yml', '.yaml'];
const JS_EXTENSIONS = [
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.vue',
  ...HTML_EXTENSIONS,
  ...YAML_EXTENSIONS,
];
const TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];

export function isHtmlFile(filePath: string) {
  return HTML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: string) {
  return YAML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isJsFile(filePath: string) {
  return JS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isTsFile(filePath: string) {
  return TS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}
