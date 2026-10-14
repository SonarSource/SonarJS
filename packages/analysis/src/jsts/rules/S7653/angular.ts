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
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';

const COMPOUND_SELECTOR = /^([A-Za-z][A-Za-z0-9-]*)\[([A-Za-z][A-Za-z0-9-]*)\]$/;

/** `changed` -> `Changed`. */
function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

/**
 * Read the static member name around an output alias:
 *
 *   @Output('fooBarChanged') changed = ...;       -> changed
 *   changed = output({ alias: 'fooBarChanged' }); -> changed
 *   @Output('fooBarChanged') [changed] = ...;     -> undefined
 */
function getOutputMemberName(node: TSESTree.Node): string | undefined {
  const member = findFirstMatchingAncestor(
    node,
    ancestor => ancestor.type === 'PropertyDefinition' || ancestor.type === 'MethodDefinition',
  );
  return member &&
    'key' in member &&
    'computed' in member &&
    !member.computed &&
    member.key.type === 'Identifier'
    ? member.key.name
    : undefined;
}

/**
 * Read a literal selector from one unambiguous directive decorator:
 *
 *   @Directive({ selector: 'foo[bar]' }) class FooBarDirective { ... } -> 'foo[bar]'
 *   @Component({ selector: 'foo[bar]' }) class FooBarComponent { ... } -> undefined
 *
 * Mixed or duplicate Angular decorators and ambiguous metadata return undefined.
 * The alias checker validates the selector shape separately.
 */
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

  const angularDecorators = declaration.decorators
    .map(decorator => decorator.expression)
    .filter(
      (expression): expression is TSESTree.CallExpression & { callee: TSESTree.Identifier } =>
        expression.type === 'CallExpression' &&
        expression.callee.type === 'Identifier' &&
        ['Component', 'Directive'].includes(expression.callee.name),
    );
  if (angularDecorators.length !== 1 || angularDecorators[0].callee.name !== 'Directive') {
    return undefined;
  }
  const directiveMetadata = angularDecorators[0].arguments[0];
  if (directiveMetadata?.type !== 'ObjectExpression') {
    return undefined;
  }
  if (
    directiveMetadata.properties.some(
      property => property.type === 'SpreadElement' || property.computed,
    )
  ) {
    return undefined;
  }
  const selectorProperties = directiveMetadata.properties.filter(
    property =>
      property.type === 'Property' &&
      ((property.key.type === 'Identifier' && property.key.name === 'selector') ||
        (property.key.type === 'Literal' && property.key.value === 'selector')),
  );
  if (selectorProperties.length !== 1) {
    return undefined;
  }
  const [property] = selectorProperties;
  if (
    property.type === 'Property' &&
    !property.computed &&
    property.value.type === 'Literal' &&
    typeof property.value.value === 'string'
  ) {
    return property.value.value;
  }
  return undefined;
}

/**
 * Match the alias to the selector and member name:
 *
 *   @Directive({ selector: 'foo[bar]' })
 *   class FooBarDirective {
 *     @Output('fooBarChanged') changed = ...;
 *     // Or: changed = output({ alias: 'fooBarChanged' });
 *   }
 *
 *   'fooBarChanged' === 'foo' + capitalize('bar') + capitalize('changed')
 *
 * Components, unsupported selectors, and mismatched aliases do not match.
 * This pattern does not prove a collision in a consuming template.
 */
export function isSelectorDerivedAlias(node: TSESTree.Node) {
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
