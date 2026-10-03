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
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const COMPOUND_SELECTOR = /^([A-Za-z][A-Za-z0-9-]*)\[([A-Za-z][A-Za-z0-9-]*)\]$/;

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function getOutputMemberName(node: TSESTree.Node) {
  const member = findFirstMatchingAncestor(
    node,
    ancestor => ancestor.type === 'PropertyDefinition' || ancestor.type === 'MethodDefinition',
  );
  return member && 'key' in member && member.key.type === 'Identifier'
    ? member.key.name
    : undefined;
}

function getCompoundSelector(node: TSESTree.Node) {
  const declaration = findFirstMatchingAncestor(
    node,
    ancestor => ancestor.type === 'ClassDeclaration' || ancestor.type === 'ClassExpression',
  );
  if (
    !declaration ||
    (declaration.type !== 'ClassDeclaration' && declaration.type !== 'ClassExpression')
  ) {
    return undefined;
  }

  for (const decorator of declaration.decorators) {
    const expression = decorator.expression;
    if (
      expression.type !== 'CallExpression' ||
      expression.callee.type !== 'Identifier' ||
      !['Component', 'Directive'].includes(expression.callee.name) ||
      expression.arguments.length === 0
    ) {
      continue;
    }
    const componentMetadata = expression.arguments[0];
    if (componentMetadata.type !== 'ObjectExpression') {
      continue;
    }
    for (const property of componentMetadata.properties) {
      if (
        property.type === 'Property' &&
        !property.computed &&
        property.key.type === 'Identifier' &&
        property.key.name === 'selector' &&
        property.value.type === 'Literal' &&
        typeof property.value.value === 'string'
      ) {
        return property.value.value;
      }
    }
  }
  return undefined;
}

function isSelectorDerivedAlias(node: TSESTree.Node) {
  if (node.type !== 'Literal' || typeof node.value !== 'string') {
    return false;
  }
  const memberName = getOutputMemberName(node);
  const selector = getCompoundSelector(node);
  const match = selector?.match(COMPOUND_SELECTOR);
  return (
    memberName !== undefined &&
    match != null &&
    node.value === `${match[1]}${capitalize(match[2])}${capitalize(memberName)}`
  );
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (
        !('node' in reportDescriptor) ||
        !isSelectorDerivedAlias(reportDescriptor.node as TSESTree.Node)
      ) {
        context.report(reportDescriptor);
      }
    },
  );
}
