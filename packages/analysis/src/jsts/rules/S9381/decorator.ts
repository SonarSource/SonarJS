/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { isFunctionNode } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

function isPromiseCallback(fn: TSESTree.Node): boolean {
  const parent = fn.parent;
  return (
    !!parent &&
    parent.type === 'CallExpression' &&
    parent.callee.type === 'MemberExpression' &&
    !parent.callee.computed &&
    parent.callee.property.type === 'Identifier' &&
    (parent.callee.property.name === 'then' || parent.callee.property.name === 'catch')
  );
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const node = (descriptor as unknown as { node: TSESTree.Node }).node;
      const enclosingFunction = findFirstMatchingAncestor(node, n =>
        isFunctionNode(n as unknown as estree.Node),
      );
      if (enclosingFunction && !isPromiseCallback(enclosingFunction)) {
        // An intervening non-promise function (a `.map()` callback, an event
        // handler, a transaction callback, ...) separates this call from its
        // enclosing promise callback: not avoidable sequential nesting.
        return;
      }
      context.report(descriptor);
    },
  );
}
