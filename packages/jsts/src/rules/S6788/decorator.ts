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
// https://sonarsource.github.io/rspec/#/rspec/S6788/javascript

import type { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

// Rewording issue message reported by the core implementation.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        messages: {
          ...rule.meta!.messages,
          noFindDOMNode:
            "Do not use findDOMNode. It doesn't work with function components and is deprecated in StrictMode.",
        },
      }),
    },
    (context, reportDescriptor) => {
      context.report({
        ...reportDescriptor,
      });
    },
  );
}
