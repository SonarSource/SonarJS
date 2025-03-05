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
import { JsTsAnalysisInput } from '../analysis.js';
import { RuleConfig } from '../../linter/config/rule-config.js';
import { AnalysisOutput } from '../../../../shared/src/types/analysis.js';

export type ProjectAnalysisOutput = {
  files: { [key: string]: AnalysisOutput };
  meta?: {
    withProgram: boolean;
    withWatchProgram: boolean;
    filesWithoutTypeChecking: string[];
    programsCreated: string[];
  };
};

export type JsTsFiles = { [key: string]: JsTsAnalysisInput };

export type Configuration = {
  tsSuffixes?: string[] /* sonar.typescript.file.suffixes */;
  jsSuffixes?: string[] /* sonar.javascript.file.suffixes */;
  tsConfigPaths?: string[] /* sonar.typescript.tsconfigPath(s) */;
  sources?: string[] /* sonar.sources property, relative path to baseDir to look for files. NOT YET SUPPORTED, we are based on baseDir */;
  inclusions?: string[] /* sonar.inclusions property, WILDCARD to narrow down sonar.sources. NOT YET SUPPORTED. */;
  exclusions?: string[] /* sonar.exclusions property, WILDCARD to narrow down sonar.sources. NOT YET SUPPORTED. */;
  tests?: string[] /* sonar.tests property, relative path to baseDir to look for test files */;
  testInclusions?: string[] /* sonar.test.inclusions property, WILDCARD to narrow down sonar.tests. NOT YET SUPPORTED. */;
  testExclusions?: string[] /* sonar.test.exclusions property, WILDCARD to narrow down sonar.tests. NOT YET SUPPORTED. */;
  jsTsExclusions?: string[] /* sonar.typescript.exclusions and sonar.javascript.exclusions wildcards */;
  maxFileSize?: number /* sonar.javascript.maxFileSize Threshold for the maximum size of analyzed files (in kilobytes).  */;
  ignoreHeaderComments?: boolean /* sonar.javascript.ignoreHeaderComments True to not count file header comments in comment metrics */;
  maxFilesForTypeChecking?: number /* sonar.javascript.sonarlint.typechecking.maxfiles Max project size to turn off type-checking of JavaScript */;
  environments?: string[] /* sonar.javascript.environments */;
  globals?: string[] /* sonar.javascript.globals */;
};

export type ProjectAnalysisInput = {
  files?: JsTsFiles;
  rules: RuleConfig[];
  configuration?: Configuration;
  baseDir: string;
  sonarlint?: boolean;
  bundles?: string[];
};

export const DEFAULT_EXCLUSIONS = [
  '**/.*',
  '**/.*/**',
  '**/*.d.ts',
  '**/node_modules/**',
  '**/bower_components/**',
  '**/dist/**',
  '**/vendor/**',
  '**/external/**',
  '**/contrib/**',
];

export const DEFAULT_MAX_FILES_FOR_TYPE_CHECKING = 20_000;

export const DEFAULT_ENVIRONMENTS = [
  'amd',
  'applescript',
  'atomtest',
  'browser',
  'commonjs',
  'embertest',
  'greasemonkey',
  'jasmine',
  'jest',
  'jquery',
  'meteor',
  'mocha',
  'mongo',
  'nashorn',
  'node',
  'phantomjs',
  'prototypejs',
  'protractor',
  'qunit',
  'serviceworker',
  'shared-node-browser',
  'shelljs',
  'webextensions',
  'worker',
];

export const DEFAULT_GLOBALS = [
  'angular',
  'goog',
  'google',
  'OpenLayers',
  'd3',
  'dojo',
  'dojox',
  'dijit',
  'Backbone',
  'moment',
  'casper',
  '_',
  'sap',
];
