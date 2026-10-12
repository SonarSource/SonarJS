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
import { ASTUtils, getNativeEventNames } from '@angular-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';

const nativeEventNames = getNativeEventNames();

/**
 * Reads static member and alias names from an upstream output-alias report.
 * @param node the reported alias literal or template element
 * @return the member and public alias names, when statically known
 */
function getOutputNames(node: TSESTree.Node): [string, string] | undefined {
  if (node.type !== 'Literal' && node.type !== 'TemplateElement') {
    return undefined;
  }
  if (
    node.type === 'TemplateElement' &&
    (node.parent.type !== 'TemplateLiteral' || node.parent.expressions.length !== 0)
  ) {
    return undefined;
  }
  if (node.type === 'Literal' && typeof node.value !== 'string') {
    return undefined;
  }
  const text = node.type === 'Literal' ? (node.value as string) : node.value.cooked;
  if (text == null) {
    return undefined;
  }
  const parent = node.type === 'TemplateElement' ? node.parent.parent : node.parent;
  if (parent?.type === 'ArrayExpression') {
    if (parent.parent.type !== 'Property') {
      return undefined;
    }
    const names = text.split(':');
    return names.length === 2 ? [names[0].trim(), names[1].trim()] : undefined;
  }
  const member = ASTUtils.getNearestNodeFrom(node, ASTUtils.isPropertyOrMethodDefinition);
  return member && !member.computed && member.key.type === 'Identifier'
    ? [member.key.name, text]
    : undefined;
}

/**
 * Allows output aliases that avoid native DOM event collisions.
 * @param rule the delegated Angular output-alias rule
 * @return the rule with collision-avoiding alias reports removed
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const names =
        'node' in descriptor ? getOutputNames(descriptor.node as TSESTree.Node) : undefined;
      if (names && nativeEventNames.has(names[0]) && !nativeEventNames.has(names[1])) {
        return;
      }
      context.report(descriptor);
    },
  );
}
