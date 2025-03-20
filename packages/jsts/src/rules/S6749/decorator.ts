/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6749/javascript

import type { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * The core implementation of the rule reports on empty React fragments.
 * Also, one of the two issue messages include a Unicode character.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, {
        ...rule.meta!,
        hasSuggestions: true,
        messages: {
          ...rule.meta!.messages,
          /* Map to a more friendly message */
          NeedsMoreChildren: 'A fragment with only one child is redundant.',
        },
      }),
    },
    (context, descriptor) => {
      const { node } = descriptor as any;

      /* Ignore empty fragments */
      if (node.type === 'JSXFragment' && node.children.length === 0) {
        return;
      }

      context.report(descriptor);
    },
  );
}
