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
import { staticText } from '../helpers/angular.js';

/**
 * Check that one direct output declaration owns the alias:
 *
 *   @Output('fooBar') changed = ...;              -> true
 *   changed = output({ alias: 'fooBar' });        -> true
 *   changed = output({ alias: 'fooBar', ...x });  -> false
 *   @Output('fooBar', x) changed = ...;           -> false
 */
function isDirectOutputAlias(
  node: TSESTree.Node,
  member: TSESTree.PropertyDefinition | TSESTree.MethodDefinition,
): boolean {
  const outputDecorators = member.decorators.filter(decorator => {
    const expression = decorator.expression;
    return (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier' &&
      expression.callee.name === 'Output'
    );
  });
  const parent = node.parent;
  if (parent?.type === 'CallExpression') {
    return (
      outputDecorators.length === 1 &&
      outputDecorators[0].expression === parent &&
      parent.arguments.length === 1 &&
      parent.arguments[0] === node
    );
  }
  const options = parent?.parent;
  const call = options?.parent;
  if (
    outputDecorators.length !== 0 ||
    parent?.type !== 'Property' ||
    parent.value !== node ||
    options?.type !== 'ObjectExpression' ||
    call?.type !== 'CallExpression' ||
    call.callee.type !== 'Identifier' ||
    call.callee.name !== 'output' ||
    call.arguments.length !== 1 ||
    call.arguments[0] !== options ||
    member.type !== 'PropertyDefinition' ||
    member.value !== call ||
    options.properties.some(property => property.type === 'SpreadElement' || property.computed)
  ) {
    return false;
  }
  const aliases = options.properties.filter(
    property =>
      property.type === 'Property' &&
      ((property.key.type === 'Identifier' && property.key.name === 'alias') ||
        (property.key.type === 'Literal' && property.key.value === 'alias')),
  );
  return aliases.length === 1 && aliases[0] === parent;
}

/**
 * Read the static member name around an output alias:
 *
 *   @Output('fooBarChanged') changed = ...;       -> changed
 *   changed = output({ alias: 'fooBarChanged' }); -> changed
 *   @Output('fooBarChanged') [changed] = ...;     -> undefined
 */
export function getOutputMemberName(node: TSESTree.Node): string | undefined {
  const aliasNode = node.type === 'TemplateElement' ? node.parent : node;
  const member = findFirstMatchingAncestor(
    node,
    ancestor => ancestor.type === 'PropertyDefinition' || ancestor.type === 'MethodDefinition',
  );
  return member &&
    'key' in member &&
    'computed' in member &&
    !member.computed &&
    member.key.type === 'Identifier' &&
    (member.type === 'PropertyDefinition' || member.type === 'MethodDefinition') &&
    isDirectOutputAlias(aliasNode, member)
    ? member.key.name
    : undefined;
}

/**
 * Read a static selector from one unambiguous directive decorator:
 *
 *   @Directive({ selector: 'foo[bar]' }) class FooBarDirective { ... } -> 'foo[bar]'
 *   @Component({ selector: 'foo[bar]' }) class FooBarComponent { ... } -> undefined
 *
 * Mixed or duplicate Angular decorators and ambiguous metadata return undefined.
 * The alias checker validates the selector shape separately.
 */
export function getCompoundSelector(node: TSESTree.Node) {
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
  if (property.type === 'Property' && !property.computed) {
    return staticText(property.value);
  }
  return undefined;
}
