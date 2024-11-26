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
// https://sonarsource.github.io/rspec/#/rspec/S3854/javascript

import type { Rule } from 'eslint';
import { getESLintCoreRule } from '../external/core.js';
import { generateMeta, mergeRules } from '../helpers/index.js';
import { meta } from './meta.js';

const constructorSuperRule = getESLintCoreRule('constructor-super');
const noThisBeforeSuperRule = getESLintCoreRule('no-this-before-super');

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: { ...constructorSuperRule.meta!.messages, ...noThisBeforeSuperRule.meta!.messages },
  }),
  create(context: Rule.RuleContext) {
    const constructorSuperListener: Rule.RuleListener = constructorSuperRule.create(context);
    const notThisBeforeSuperListener: Rule.RuleListener = noThisBeforeSuperRule.create(context);

    return mergeRules(constructorSuperListener, notThisBeforeSuperListener);
  },
};
