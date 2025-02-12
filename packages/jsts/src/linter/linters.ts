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
import { debug } from '../../../shared/src/helpers/logging.js';
import { LinterWrapper } from './wrapper.js';
import { RuleConfig } from './config/rule-config.js';
import { APIError } from '../../../shared/src/errors/error.js';

/**
 * The global ESLint linters
 *
 * Any linter is expected to be initialized before use.
 * To this end, the plugin is expected to explicitly send a request to
 * initialize a linter before starting the actual analysis of a file.
 */
let linter: LinterWrapper;

/**
 * Initializes the global linter wrapper
 * @param inputRules the rules from the active quality profiles
 * @param environments the JavaScript execution environments
 * @param globals the global variables
 * @param workingDirectory the working director
 */
export async function initializeLinter(
  inputRules: RuleConfig[],
  environments: string[] = [],
  globals: string[] = [],
  workingDirectory?: string,
) {
  debug(`Initializing linter with ${inputRules.map(rule => rule.key)}`);
  linter = new LinterWrapper({ inputRules, environments, globals, workingDirectory });
  await linter.init();
}

/**
 * Returns the linter
 * Throws a runtime error if the global linter wrapper is not initialized.
 */
export function getLinter() {
  if (!linter) {
    throw APIError.linterError(`Linter does not exist. Did you call /init-linter?`);
  }
  return linter;
}
