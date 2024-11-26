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
// https://sonarsource.github.io/rspec/#/rspec/S6441/javascript

import type { Rule } from 'eslint';
import { rules as reactHooksRules } from 'eslint-plugin-react-hooks';
import { detectReactRule, generateMeta, interceptReport, mergeRules } from '../helpers/index.js';
import { meta } from './meta.js';

const rulesOfHooks = reactHooksRules['rules-of-hooks'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { ...rulesOfHooks.meta }),
  create(context: Rule.RuleContext) {
    let isReact = false;

    const detectReactListener: Rule.RuleModule = interceptReport(detectReactRule, function () {
      isReact = true;
    });
    const rulesOfHooksListener: Rule.RuleModule = interceptReport(
      rulesOfHooks,
      function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
        if (isReact) {
          context.report(descriptor);
        }
      },
    );

    return mergeRules(detectReactListener.create(context), rulesOfHooksListener.create(context));
  },
};
