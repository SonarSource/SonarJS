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
// https://sonarsource.github.io/rspec/#/rspec/S1481/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const baseRule = tsEslintRules['no-unused-vars'];
const defaultOptions = [
  {
    args: 'none',
    caughtErrors: 'none',
  },
];
const ruleWithoutQuickFixes = interceptReport(baseRule, (context, descriptor) => {
  if (isLegacyIgnoredRestSibling(descriptor)) {
    return;
  }
  const { fix: _fix, suggest: _suggest, ...rest } = descriptor;
  context.report(rest);
});

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    ...baseRule.meta,
    defaultOptions,
    fixable: undefined,
    hasSuggestions: undefined,
  }),
  create: ruleWithoutQuickFixes.create,
};

type NodeWithParent = estree.Node & { parent?: NodeWithParent };

function isLegacyIgnoredRestSibling(descriptor: Rule.ReportDescriptor) {
  if (!('node' in descriptor) || descriptor.node.type !== 'Identifier') {
    return false;
  }

  const property = getParent(descriptor.node);
  if (
    property?.type !== 'Property' ||
    !property.shorthand ||
    property.value !== descriptor.node ||
    getParent(property)?.type !== 'ObjectPattern'
  ) {
    return false;
  }

  const objectPattern = getParent(property);
  return (
    objectPattern.properties.at(-1)?.type === 'RestElement' &&
    isInsideVariableDeclarationPattern(objectPattern)
  );
}

function isInsideVariableDeclarationPattern(node: NodeWithParent) {
  let current: NodeWithParent | undefined = node;

  while (current?.parent) {
    if (current.parent.type === 'VariableDeclarator') {
      return current.parent.id === current;
    }
    current = current.parent;
  }

  return false;
}

function getParent(node: estree.Node) {
  return (node as NodeWithParent).parent;
}
