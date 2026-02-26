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
// https://sonarsource.github.io/rspec/#/rspec/S7723/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const node = reportDescriptor.node as estree.CallExpression;
        if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
          const { name } = node.callee;
          // Object(value) is a type coercion pattern, not object creation
          if (name === 'Object' && node.arguments.length >= 1) {
            return;
          }
          // Array(n) is a standard idiom for pre-sized array creation
          if (name === 'Array' && node.arguments.length === 1) {
            return;
          }
        }
      }
      context.report(reportDescriptor);
    },
  );
}
