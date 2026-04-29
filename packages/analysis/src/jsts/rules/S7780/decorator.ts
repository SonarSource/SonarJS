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
// https://sonarsource.github.io/rspec/#/rspec/S7780/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { ancestorsChain } from '../helpers/ancestor.js';
import * as meta from './generated-meta.js';

const TEMPLATE_LITERAL_TYPES = new Set(['TemplateLiteral']);

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (_context, descriptor) => {
      if (!shouldDropQuickFix(descriptor)) {
        _context.report(descriptor);
        return;
      }

      // Mirror S4624: only drop the quick fix when the replacement creates a nested
      // template literal that shares the enclosing template's boundary line.
      const { fix: _fix, ...rest } = descriptor as Rule.ReportDescriptor & { fix?: unknown };
      _context.report(rest);
    },
  );
}

function shouldDropQuickFix(descriptor: Rule.ReportDescriptor) {
  if (!('fix' in descriptor) || !('node' in descriptor)) {
    return false;
  }

  const node = descriptor.node as TSESTree.Node;
  if (node.type !== 'Literal' || typeof node.value !== 'string' || !node.loc) {
    return false;
  }

  const nestingTemplate = findEnclosingTemplateLiteral(node);
  // S4624 only reports nested template literals that start on the enclosing
  // template's first line or end on its last line.
  return (
    !!nestingTemplate?.loc &&
    (node.loc.start.line === nestingTemplate.loc.start.line ||
      node.loc.end.line === nestingTemplate.loc.end.line)
  );
}

function findEnclosingTemplateLiteral(node: TSESTree.Node) {
  const ancestors = ancestorsChain(node, TEMPLATE_LITERAL_TYPES);
  const candidate = ancestors.at(-1);
  return candidate?.type === 'TemplateLiteral' ? candidate : undefined;
}
