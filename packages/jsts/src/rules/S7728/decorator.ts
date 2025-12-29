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
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type estree from 'estree';
import {
  generateMeta,
  getTypeFromTreeNode,
  interceptReport,
  isAny,
  isRequiredParserServices,
  isIterable,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the no-array-for-each rule to avoid false positives where
 * the rule suggests replacing forEach with for..of on objects that
 * are not iterable.
 *
 * The rule should only suggest for..of when the object has Symbol.iterator,
 * meaning it can actually be used in a for..of loop.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const services = context.sourceCode.parserServices;

      // If we don't have type information, let the report through
      // (matches current behavior for JS files)
      if (!isRequiredParserServices(services)) {
        context.report(reportDescriptor);
        return;
      }

      if ('node' in reportDescriptor) {
        const node = reportDescriptor.node as TSESTree.Node;

        // The unicorn rule reports the `forEach` identifier
        // We need to get the object that forEach is called on
        // node = `forEach`, parent = `obj.forEach`, parent.object = `obj`
        if (node.parent?.type === 'MemberExpression' && node.parent.property === node) {
          const objectNode = node.parent.object;
          const type = getTypeFromTreeNode(objectNode as estree.Node, services);

          // If type is 'any', we can't determine iterability, so report (err on side of caution)
          // Only suppress when we can prove the type is NOT iterable
          if (isAny(type) || isIterable(objectNode as estree.Node, services)) {
            context.report(reportDescriptor);
          }
          // Otherwise suppress the report - it's a false positive
        } else {
          // Unexpected node structure, let the report through
          context.report(reportDescriptor);
        }
      }
    },
  );
}
