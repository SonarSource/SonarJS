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
// https://sonarsource.github.io/rspec/#/rspec/S6441/javascript

import { Rule } from 'eslint';
import { rule as detectReact } from '../utils/rule-detect-react';
import { rules as reactRules } from 'eslint-plugin-react';
import { mergeRules } from '../utils';

const noUnusedClassComponentMethod = reactRules['no-unused-class-component-methods'];

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
    function overrideContext(overrides: any) {
      Object.setPrototypeOf(overrides, context);
      return overrides;
    }

    let isReact = false;

    const detectReactContext = overrideContext({
      report(_descriptor: Rule.ReportDescriptor): void {
        isReact = true;
      },
    });

    // We may need to add deprecated API that the react plugin still relies on if the rule is decorated by
    // 'interceptReport()'.
    const contextIfReact: Rule.RuleContext = overrideContext({
      report(descriptor: Rule.ReportDescriptor): void {
        if (isReact) {
          context.report(descriptor);
        }
      },
    });

    const detectReactListener: Rule.RuleListener = detectReact.create(detectReactContext);
    const noUnusedClassComponentMethodListener: Rule.RuleListener =
      noUnusedClassComponentMethod.create(contextIfReact);

    return mergeRules(detectReactListener, noUnusedClassComponentMethodListener);
  },
};
