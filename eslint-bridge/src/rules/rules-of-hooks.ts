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
import { rules as reactHooksRules } from 'eslint-plugin-react-hooks';
import { interceptReport, mergeRules } from '../utils';
import * as estree from 'estree';

const rulesOfHooks = reactHooksRules['rules-of-hooks'];

export const rule: Rule.RuleModule = {
  meta: rulesOfHooks.meta,
  create(context: Rule.RuleContext) {
    const detectReactListener = detectReact.create(context);

    // We may need to add deprecated API that the react plugin still relies on if the rule is decorated by 'interceptReport();.
    let contextWithDeprecated: Rule.RuleContext = context;
    if (!('getSource' in context)) {
      contextWithDeprecated = Object.assign(Object.create(context), {
        getSource(node: estree.Node) {
          return context.getSourceCode().getText(node);
        },
      });
    }
    const rulesOfHooksListener = rulesOfHooks.create(contextWithDeprecated);

    return mergeRules(detectReactListener, rulesOfHooksListener);
  },
};

export function decorateRulesOfHooks(ruleModule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(ruleModule, reportIfReact());
}

function reportIfReact() {
  let isReact = false;
  return (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) => {
    if ('messageId' in descriptor && descriptor.messageId === 'reactDetected') {
      isReact = true;
    } else if (isReact) {
      context.report(descriptor);
    }
  };
}
