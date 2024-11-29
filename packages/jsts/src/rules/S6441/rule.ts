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
import { rules } from '../external/react.js';
import { detectReactRule, generateMeta, mergeRules } from '../helpers/index.js';
import { meta } from './meta.js';

const noUnusedClassComponentMethod = rules['no-unused-class-component-methods'];

function overrideContext(context: Rule.RuleContext, overrides: any): Rule.RuleContext {
  Object.setPrototypeOf(overrides, context);
  return overrides;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    ...noUnusedClassComponentMethod.meta,
    messages: {
      ...noUnusedClassComponentMethod.meta!.messages,
      unused:
        'Remove this property or method or refactor this component, as "{{name}}" is not used inside component body',
      unusedWithClass:
        'Remove this property or method or refactor "{{className}}", as "{{name}}" is not used inside component body',
    },
  }),
  create(context: Rule.RuleContext) {
    let isReact = false;

    const detectReactListener: Rule.RuleListener = detectReactRule.create(
      overrideContext(context, {
        report(_descriptor: Rule.ReportDescriptor): void {
          isReact = true;
        },
      }),
    );

    const noUnusedClassComponentMethodListener: Rule.RuleListener =
      noUnusedClassComponentMethod.create(
        overrideContext(context, {
          report(descriptor: Rule.ReportDescriptor): void {
            if (isReact) {
              context.report(descriptor);
            }
          },
        }),
      );

    return mergeRules(detectReactListener, noUnusedClassComponentMethodListener);
  },
};
