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
import type { Rule } from 'eslint';
import { hasSonarRuntimeOption, SONAR_RUNTIME } from '../parameters/sonar-runtime.js';
import { hasSonarContextOption } from '../parameters/sonar-context.js';
import { FileType } from '../../../../shared/src/helpers/files.js';
import { JsTsLanguage } from '../../../../shared/src/helpers/language.js';
import { getContext } from '../../../../shared/src/helpers/context.js';

/**
 * An input rule configuration for linting
 *
 * @param key an ESLint rule key that maps a SonarQube rule identifier (SXXX) to the rule implementation
 * @param configurations an ESLint rule configuration provided from the anaylzer if the rule behaviour is customizable
 * @param fileTypeTarget a list of file type targets to filter issues in case the rule applies to main files, test files, or both
 *
 * The configuration of a rule is used to uniquely identify a rule, customize its behaviour,
 * and define what type(s) of file it should apply to during linting.
 *
 * An ESLint rule configuration can theoretically be a plain JavaScript object or a string. However, given the
 * nature of SonarQube' rule properties, it is currently used in the form of a string.
 */
export interface RuleConfig {
  key: string;
  configurations: any[];
  fileTypeTarget: FileType[] | FileType;
  language?: JsTsLanguage;
}

/**
 * Extends an input rule configuration
 *
 * A rule configuration might be extended depending on the rule definition.
 * The purpose of the extension is to activate additional features during
 * linting, e.g., secondary locations.
 *
 * _A rule extension only applies to rules whose implementation is available._
 *
 * @param ruleModule the rule definition
 * @param inputRule the rule configuration
 * @returns the extended rule configuration
 */
export function extendRuleConfig(ruleModule: Rule.RuleModule | undefined, inputRule: RuleConfig) {
  const options = [...inputRule.configurations];
  if (hasSonarRuntimeOption(ruleModule, inputRule.key)) {
    options.push(SONAR_RUNTIME);
  }
  if (hasSonarContextOption(ruleModule, inputRule.key)) {
    options.push(getContext());
  }
  return options;
}
