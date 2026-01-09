/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S7770/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, hasTypePredicateReturn, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the unicorn/prefer-native-coercion-functions rule to skip functions
 * that have a type predicate return type.
 *
 * Type predicate functions like `(x): x is string => Boolean(x)` have different
 * semantics than just `Boolean` - they narrow the type. Suggesting to replace
 * them with `Boolean` would lose the type narrowing behavior.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as { node?: estree.Node }).node;
      if (!node) {
        context.report(reportDescriptor);
        return;
      }

      // Check if this function has a type predicate return type
      if (hasTypePredicateReturn(node)) {
        return; // Skip reporting for type predicate functions
      }

      context.report(reportDescriptor);
    },
  );
}
