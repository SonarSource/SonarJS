/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { FileType, JsTsLanguage } from '../../../../../shared/src/helpers/index.js';
import path from 'path';
import { buildSourceCode } from '../../../../src/builders/index.js';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
/**
 * This function is provided as 'parseForESLint' implementation which is used in RuleTester to invoke exactly same logic
 * as we use in our 'services/analysis/analyzer.ts' module
 */
export function parseForESLint(
  fileContent: string,
  options: { filePath: string },
  fileType: FileType = 'MAIN',
) {
  const { filePath } = options;
  const tsConfigs = [
    path.join(dirname(fileURLToPath(import.meta.url)), '../../../../src/rules', 'tsconfig.cb.json'),
  ];
  const sourceCode = buildSourceCode(
    { filePath, fileContent, fileType, tsConfigs },
    languageFromFile(fileContent, filePath),
  );

  /**
   * ESLint expects the parser services (including the type checker) to be available in a field
   * `services` after parsing while TypeScript ESLint returns it as `parserServices`. Therefore,
   * we need to extend the source code with this additional property so that the type checker
   * can be retrieved from type-aware rules.
   */
  return Object.create(sourceCode, {
    services: { value: sourceCode.parserServices },
  });
}

/**
 * Returns the source code's language based on the file content and path.
 */
function languageFromFile(fileContent: string, filePath: string): JsTsLanguage {
  // Keep this regex aligned with the one in JavaScriptFilePredicate.java to have the same flow
  const hasScriptTagWithLangTs = /<script[^>]+lang=['"]ts['"][^>]*>/;
  const { ext } = path.parse(filePath);
  if (
    ['.ts', '.tsx'].includes(ext) ||
    (ext === '.vue' && hasScriptTagWithLangTs.test(fileContent))
  ) {
    return 'ts';
  } else {
    return 'js';
  }
}
