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
import { isOnEnclosingTemplateDelimiterLine } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

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

      // Mirror S4624: only drop fixes that create a nested template literal
      // on the enclosing template's start or end line.
      const {
        fix: _fix,
        suggest: _suggest,
        ...rest
      } = descriptor as Rule.ReportDescriptor & {
        fix?: unknown;
        suggest?: unknown;
      };
      _context.report(rest);
    },
  );
}

function shouldDropQuickFix(descriptor: Rule.ReportDescriptor) {
  if (!hasQuickFix(descriptor) || !('node' in descriptor)) {
    return false;
  }

  const node = descriptor.node as TSESTree.Node;
  if (node.type !== 'Literal' || typeof node.value !== 'string' || !node.loc) {
    return false;
  }

  return isOnEnclosingTemplateDelimiterLine(node);
}

function hasQuickFix(descriptor: Rule.ReportDescriptor) {
  return 'fix' in descriptor || ('suggest' in descriptor && Array.isArray(descriptor.suggest));
}
