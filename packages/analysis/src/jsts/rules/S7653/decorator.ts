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
import { getNativeEventNames } from '@angular-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { getAngularOutputNames, staticText } from '../helpers/angular.js';

const nativeEventNames = getNativeEventNames();

const COMPOUND_SELECTOR = /^([A-Za-z][A-Za-z0-9-]*)\[([A-Za-z][A-Za-z0-9-]*)\]$/;

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
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
    if (
      componentMetadata.properties.some(
        property => property.type === 'SpreadElement' || property.computed,
      )
    ) {
      return undefined;
    }
    const selectorProperties = componentMetadata.properties.filter(
      property =>
        property.type === 'Property' &&
        ((property.key.type === 'Identifier' && property.key.name === 'selector') ||
          (property.key.type === 'Literal' && property.key.value === 'selector')),
    );
    if (selectorProperties.length !== 1) {
      return undefined;
    }
    const [property] = selectorProperties;
    if (property.type === 'Property' && !property.computed) {
      return staticText(property.value);
    }
  }
  return undefined;
}

function isSelectorDerivedAlias(node: TSESTree.Node, names: [string, string] | undefined) {
  const aliasNode = node.type === 'TemplateElement' ? node.parent : node;
  if (!names || aliasNode.parent?.type === 'ArrayExpression') {
    return false;
  }
  const [memberName, alias] = names;
  const selector = getCompoundSelector(node);
  const match = selector?.match(COMPOUND_SELECTOR);
  return match != null && alias === `${match[1]}${capitalize(match[2])}${capitalize(memberName)}`;
}

/**
 * Allows aliases that avoid native event collisions or derive from a compound selector.
 * @param rule the delegated Angular output-alias rule
 * @return the rule with eligible output-alias reports removed
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if ('node' in descriptor) {
        const node = descriptor.node as TSESTree.Node;
        const names = getAngularOutputNames(node);
        if (
          (names && nativeEventNames.has(names[0]) && !nativeEventNames.has(names[1])) ||
          isSelectorDerivedAlias(node, names)
        ) {
          return;
        }
      }
      context.report(descriptor);
    },
  );
}
