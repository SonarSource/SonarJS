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
import type ts from 'typescript';
import { COMPILER_OPTION_PATHS, COMPILER_OPTION_PATH_LISTS } from './configuration-fields.js';
import { objectFromStruct } from './struct-conversion.js';

type PathTransform = (path: string) => string;

/**
 * Rewrites every path-valued compiler option (single paths, path lists and `paths` mappings)
 * through `transform`, leaving all other options untouched.
 */
export function compilerOptionsForStorage(
  options: ts.CompilerOptions,
  transform: PathTransform,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).map(([key, value]) => {
      if (COMPILER_OPTION_PATHS.has(key) && typeof value === 'string') {
        return [key, transform(value)];
      }
      if (COMPILER_OPTION_PATH_LISTS.has(key) && Array.isArray(value)) {
        return [key, value.map(item => (typeof item === 'string' ? transform(item) : item))];
      }
      if (key === 'paths' && value && typeof value === 'object') {
        return [key, mapCompilerOptionPaths(value, transform)];
      }
      return [key, value];
    }),
  );
}

export function restoreCompilerOptions(
  struct: { fields?: Record<string, unknown> | null },
  transform: PathTransform,
): ts.CompilerOptions {
  const options = objectFromStruct(struct);
  for (const [key, value] of Object.entries(options)) {
    if (COMPILER_OPTION_PATHS.has(key) && typeof value === 'string') {
      options[key] = transform(value);
    } else if (COMPILER_OPTION_PATH_LISTS.has(key) && Array.isArray(value)) {
      options[key] = value.map(item => (typeof item === 'string' ? transform(item) : item));
    } else if (key === 'paths' && value && typeof value === 'object') {
      options[key] = mapCompilerOptionPaths(value, transform);
    }
  }
  return options as ts.CompilerOptions;
}

function mapCompilerOptionPaths(value: object, transform: PathTransform): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, paths]) => [
      key,
      Array.isArray(paths)
        ? paths.map(item => (typeof item === 'string' ? transform(item) : item))
        : paths,
    ]),
  );
}
