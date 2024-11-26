/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

type Linters = { [id: string]: LinterWrapper };
/**
 * The global ESLint linters
 *
 * Any linter is expected to be initialized before use.
 * To this end, the plugin is expected to explicitly send a request to
 * initialize a linter before starting the actual analysis of a file.
 * The global linters object will keep the already initialized linters
 * indexed by their linterId. If no linterId is provided, `default` will
 * be used.
 * Having multiple linters (each with different set of rules enabled)
 * is needed in order to not run all rules on 'unchanged' files
 */
const linters: Linters = {};

/**
 * Initializes the global linter wrapper
 * @param inputRules the rules from the active quality profiles
 * @param environments the JavaScript execution environments
 * @param globals the global variables
 * @param workingDirectory the working directory
 * @param linterId key of the linter
 */
export async function initializeLinter(
  inputRules: RuleConfig[],
  environments: string[] = [],
  globals: string[] = [],
  workingDirectory?: string,
  linterId = 'default',
) {
  debug(`Initializing linter "${linterId}" with ${inputRules.map(rule => rule.key)}`);
  linters[linterId] = new LinterWrapper({ inputRules, environments, globals, workingDirectory });
  await linters[linterId].init();
}

/**
 * Returns the linter with the given ID
 *
 * @param linterId key of the linter
 *
 * Throws a runtime error if the global linter wrapper is not initialized.
 */
export function getLinter(linterId: keyof Linters = 'default') {
  if (!linters[linterId]) {
    throw APIError.linterError(`Linter ${linterId} does not exist. Did you call /init-linter?`);
  }
  return linters[linterId];
}
