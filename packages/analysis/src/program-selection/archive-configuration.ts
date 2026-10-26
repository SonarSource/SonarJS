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
export const PROJECT_CONFIGURATION_PATHS = [
  'jsTsExclusions',
  'sources',
  'tests',
  'inclusions',
  'exclusions',
  'testInclusions',
  'testExclusions',
] as const;
// These are effective analyzer settings, not arbitrary scanner properties. The request remains
// authoritative for its submitted files and runtime-specific filesystem behavior.
export const REPLAYABLE_CONFIGURATION_FIELDS = [
  'allowTsParserJsFiles',
  'ignoreHeaderComments',
  'maxFileSize',
  'environments',
  'globals',
  'tsSuffixes',
  'jsSuffixes',
  'cssSuffixes',
  'htmlSuffixes',
  'yamlSuffixes',
  'cssAdditionalSuffixes',
  'detectBundles',
  'detectGeneratedCode',
  'createTsProgramForOrphanFiles',
  'disableTypeChecking',
  'skipNodeModuleLookupOutsideBaseDir',
  'ecmaScriptVersion',
  ...PROJECT_CONFIGURATION_PATHS,
] as const;
export type ReplayableConfiguration = Partial<
  Record<(typeof REPLAYABLE_CONFIGURATION_FIELDS)[number], unknown>
>;

export const PROJECT_RELATIVE_PATH_PREFIX = '\0project-relative:';
export const COMPILER_OPTION_PATHS = new Set([
  'baseUrl',
  'configFilePath',
  'declarationDir',
  'mapRoot',
  'outDir',
  'pathsBasePath',
  'rootDir',
  'sourceRoot',
  'tsBuildInfoFile',
]);
export const COMPILER_OPTION_PATH_LISTS = new Set(['rootDirs', 'typeRoots']);
