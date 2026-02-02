/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { type NormalizedAbsolutePath } from '../helpers/files.js';
import { RawConfiguration } from '../helpers/configuration.js';

/**
 * A sanitized analysis input with all required fields populated.
 *
 * This is the internal type used after sanitization. All fields are required
 * because sanitization fills in defaults and reads file content if needed.
 *
 * @param filePath the normalized absolute path of the file to analyze
 * @param fileContent the content of the file to analyze
 * @param sonarlint whether analysis is running in SonarLint context
 */
export interface AnalysisInput {
  filePath: NormalizedAbsolutePath;
  fileContent: string;
  sonarlint: boolean;
}

/**
 * Raw analysis input as received from JSON deserialization.
 * Path fields are strings that haven't been validated or normalized yet.
 * Fields are optional and will be filled with defaults during sanitization.
 */
export interface RawAnalysisInput {
  filePath: string;
  fileContent?: string;
  sonarlint?: boolean;
  configuration?: RawConfiguration;
}

/**
 * An analysis output
 *
 * A common interface for all kinds of analysis output.
 */
export interface AnalysisOutput {}
