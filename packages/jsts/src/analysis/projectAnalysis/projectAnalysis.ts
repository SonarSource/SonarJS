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

import { JsTsAnalysisOutput } from '../analysis.js';
import { FileType } from '../../../../shared/src/helpers/files.js';
import { JsTsLanguage } from '../../../../shared/src/helpers/language.js';
import { RuleConfig } from '../../linter/config/rule-config.js';

export type ProjectAnalysisOutput = {
  files: { [key: string]: JsTsAnalysisOutput };
  meta?: {
    withProgram: boolean;
    withWatchProgram: boolean;
    filesWithoutTypeChecking: string[];
    programsCreated: string[];
  };
};

export type JsTsFile = {
  fileContent?: string;
  ignoreHeaderComments?: boolean;
  fileType: FileType;
  language?: JsTsLanguage;
};

export type JsTsFiles = { [key: string]: JsTsFile };

export type ProjectAnalysisInput = {
  files: JsTsFiles;
  rules: RuleConfig[];
  environments?: string[];
  globals?: string[];
  baseDir: string;
  exclusions?: string[];
  isSonarlint?: boolean;
  maxFilesForTypeChecking?: number;
};

export const DEFAULT_LANGUAGE: JsTsLanguage = 'ts';

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
