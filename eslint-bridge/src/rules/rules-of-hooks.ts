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

const rulesOfHooks = reactHooksRules['rules-of-hooks'];

export const rule: Rule.RuleModule = {
  meta: {
    messages: { ...detectReact.meta!.messages, ...rulesOfHooks.meta!.messages },
  },
  create(context: Rule.RuleContext) {
    const detectReactListener = detectReact.create(context);
    const rulesOfHooksListener = rulesOfHooks.create(context);
    return mergeRules(detectReactListener, rulesOfHooksListener);
  },
};

export function decorateRulesOfHooks(ruleModule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(ruleModule, reportIfReact());
}

function reportIfReact() {
  let isReact = false;
  return (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) => {
    if (
      ('messageId' in descriptor && descriptor.messageId === 'reactDetected') ||
      ('message' in descriptor && descriptor.message === 'React detected')
    ) {
      isReact = true;
    } else if (isReact) {
      context.report(descriptor);
    }
  };
}
