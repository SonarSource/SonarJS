/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { APIError } from 'errors';
import { debug } from 'helpers';
import { LinterWrapper, RuleConfig } from './linter';
// @ts-ignore
import { htmlPlugin } from 'eslint-plugin-html';
import { ESLint } from 'eslint';
import path from 'path';
import { buildParserOptions, parsers } from '../../parsing/jsts';
import { JsTsAnalysisInput } from '../../services/analysis';

export * from './linter';
export * from './rules';
type Linters = { [id: string]: LinterWrapper };
type ESLintsWithHTML = { [id: string]: ESLint };
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
const eslints: ESLintsWithHTML = {};

/**
 * Initializes the global linter wrapper
 * @param inputRules the rules from the active quality profiles
 * @param environments the JavaScript execution environments
 * @param globals the global variables
 * @param linterId key of the linter
 */
export async function initializeLinter(
  inputRules: RuleConfig[],
  environments: string[] = [],
  globals: string[] = [],
  linterId = 'default',
) {
  debug(`Initializing linter "${linterId}" with ${inputRules.map(rule => rule.key)}`);
  const linter = new LinterWrapper({ inputRules, environments, globals });
  const overrideConfig = {
    ...linter.config['MAIN'],
    parser: parsers.javascript.parser,
    parserOptions: buildParserOptions(
      { fileContent: '', filePath: '', fileType: 'MAIN' } as JsTsAnalysisInput,
      true,
    ),
  };
  const eslint = new ESLint({ overrideConfig, plugins: { html: htmlPlugin } });
  const { getESLintPrivateMembers } = await import(
    path.join(require.resolve('eslint'), '..', 'eslint', 'eslint')
  );
  const { getCLIEngineInternalSlots } = await import(
    path.join(require.resolve('eslint'), '..', 'cli-engine', 'cli-engine')
  );
  const { cliEngine } = getESLintPrivateMembers(eslint);
  const slots = getCLIEngineInternalSlots(cliEngine);
  slots.linter = linter.linter;

  linters[linterId] = linter;
  eslints[linterId] = eslint;
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

/**
 * Returns the ESLint instance with the given ID
 *
 * @param eslintId key of the linter/ESLint instance
 *
 * Throws a runtime error if the global linter wrapper and ESLint instance are not initialized.
 */
export function getESLint(eslintId: keyof ESLintsWithHTML = 'default') {
  if (!eslints[eslintId]) {
    throw APIError.linterError(
      `ESLint instance ${eslintId} does not exist. Did you call /init-linter?`,
    );
  }
  return eslints[eslintId];
}
