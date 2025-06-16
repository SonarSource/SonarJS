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
import { filterBundle } from './filter-bundle.js';
import { filterMinified } from './filter-minified.js';
import { filterSize } from './filter-size.js';
import { getMaxFileSize, isCssFile, isJsTsFile } from '../configuration.js';

export function accept(filePath: string, fileContent: string): boolean {
  if (isJsTsFile(filePath)) {
    return (
      filterBundle(fileContent) &&
      filterMinified(filePath, fileContent) &&
      filterSize(fileContent, getMaxFileSize())
    );
  } else if (isCssFile(filePath)) {
    // We ignore the size limit for CSS files because analyzing large CSS files takes a reasonable amount of time
    return filterBundle(fileContent) && filterMinified(filePath, fileContent);
  }
  return true;
}
