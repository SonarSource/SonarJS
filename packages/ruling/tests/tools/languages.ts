/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import path from 'path';
import { JS_EXTENSIONS, TS_EXTENSIONS } from '../../../shared/src/helpers/language.js';

const HTML_EXTENSIONS = ['.html', '.htm'];
const YAML_EXTENSIONS = ['.yml', '.yaml'];
const JSTS_EXTENSIONS = JS_EXTENSIONS.concat(TS_EXTENSIONS);

export function isHtmlFile(filePath: string) {
  return HTML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isYamlFile(filePath: string) {
  return YAML_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}

export function isJsTsFile(filePath: string) {
  return JSTS_EXTENSIONS.includes(path.posix.extname(filePath).toLowerCase());
}
