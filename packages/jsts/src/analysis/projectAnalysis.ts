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

import { FileType, JsTsLanguage } from '@sonar/shared';
import { JsTsAnalysisOutput, RuleConfig } from '@sonar/jsts';

export type ProjectAnalysisOutput = {
  files: { [key: string]: JsTsAnalysisOutput };
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
  environments: string[];
  globals: string[];
  baseDir: string;
  tsConfigs?: string[];
  exclusions?: string[];
  isSonarlint?: boolean;
};
