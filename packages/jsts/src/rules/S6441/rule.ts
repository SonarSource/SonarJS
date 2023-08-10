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
// https://sonarsource.github.io/rspec/#/rspec/S6441/javascript

import { Rule } from 'eslint';
import { rules as reactRules } from 'eslint-plugin-react';
import { rule as detectReact } from '../helpers';
import { mergeRules } from '../decorators/helpers';

const noUnusedClassComponentMethod = reactRules['no-unused-class-component-methods'];

function overrideContext(context: Rule.RuleContext, overrides: any): Rule.RuleContext {
  Object.setPrototypeOf(overrides, context);
  return overrides;
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      unused:
        'Remove this property or method or refactor this component, as "{{name}}" is not used inside component body',
      unusedWithClass:
        'Remove this property or method or refactor "{{className}}", as "{{name}}" is not used inside component body',
    },
  },
  create(context: Rule.RuleContext) {
    let isReact = false;

    const detectReactListener: Rule.RuleListener = detectReact.create(
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
