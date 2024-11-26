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
// https://sonarsource.github.io/rspec/#/rspec/S6481/javascript

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return changeRuleMessagesWith(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    lineRemover(),
  );
}

function changeRuleMessagesWith(
  rule: Rule.RuleModule,
  messageChanger: (message: string) => string,
) {
  if (rule.meta?.messages) {
    const messages = rule.meta.messages;
    const newMessages = Object.fromEntries(
      Object.entries(messages).map(([key, value]) => [key, messageChanger(value)]),
    );
    rule.meta.messages = newMessages;
  }
  return rule;
}

function lineRemover() {
  const lineRegexp = / \(at line [^)]+\)/g;
  return (message: string) => message.replace(lineRegexp, '');
}
