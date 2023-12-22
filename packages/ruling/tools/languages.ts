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

const JS_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.vue'];
const TS_EXTENSIONS = ['.ts', '.mts', '.cts', '.tsx'];
const VUE_TS_REGEX = /<script[^>]+lang=['"]ts['"][^>]*>/;

export function getLanguage(filePath: string, contents: string) {
  const extension = path.posix.extname(filePath).toLowerCase();
  if (
    TS_EXTENSIONS.includes(extension) ||
    (extension.endsWith('.vue') && VUE_TS_REGEX.test(contents))
  ) {
    return 'ts';
  } else if (JS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase())) {
    return 'js';
  }
  throw Error(`File ${filePath} is neither "js" nor "ts"`);
}
