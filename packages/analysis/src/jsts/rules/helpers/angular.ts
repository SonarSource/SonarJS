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
import { isStringLiteral } from './ast.js';
import { getFullyQualifiedName } from './module.js';

const ANGULAR_CORE = '@angular.core';

/** Returns text from `'refresh'` or `` `refresh` ``, but never from dynamic expressions. */
function staticText(node: TSESTree.Node | undefined): string | undefined {
  if (node && isStringLiteral(node as unknown as estree.Node)) {
    return (node as unknown as estree.Literal).value as string;
  }
  if (node?.type === 'TemplateLiteral') {
    return node.expressions.length === 0 && node.quasis.length === 1
      ? (node.quasis[0].value.cooked ?? undefined)
      : undefined;
  }
  if (node?.type === 'TemplateElement' && node.parent?.type === 'TemplateLiteral') {
    const template = node.parent;
    return template.expressions.length === 0 && template.quasis.length === 1
      ? (node.value.cooked ?? undefined)
      : undefined;
  }
  return undefined;
}

/** Accepts only direct keys such as `{ alias: 'refresh' }`, not computed properties. */
function propertyName(property: TSESTree.Property): string | undefined {
  return !property.computed && property.key.type === 'Identifier' ? property.key.name : undefined;
}

/** Recognizes the Angular `output({ alias: 'refresh' })` property initializer. */
function outputAliasFromCall(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition,
): string | undefined {
  const call = member.value;
  if (
    call?.type !== 'CallExpression' ||
    getFullyQualifiedName(context, call.callee as unknown as estree.Node) !==
      `${ANGULAR_CORE}.output`
  ) {
    return undefined;
  }
  const options = call.arguments[0];
  if (
    options?.type !== 'ObjectExpression' ||
    options.properties.some(property => property.type !== 'Property')
  ) {
    return undefined;
  }
  const properties = options.properties as TSESTree.Property[];
  const aliases = properties.filter(property => propertyName(property) === 'alias');
  return aliases.length === 1 ? staticText(aliases[0].value) : undefined;
}

/** Recognizes the Angular `@Output('refresh')` field or getter decorator. */
function outputAliasFromDecorator(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition | TSESTree.MethodDefinition,
): string | undefined {
  const outputDecorator = member.decorators.find(decorator => {
    const expression = decorator.expression;
    return (
      expression.type === 'CallExpression' &&
      getFullyQualifiedName(context, expression.callee as unknown as estree.Node) ===
        `${ANGULAR_CORE}.Output`
    );
  });
  const expression = outputDecorator?.expression;
  return expression?.type === 'CallExpression' ? staticText(expression.arguments[0]) : undefined;
}

/** Recognizes Angular component decorators such as `@Component({ outputs: [...] })`. */
function isAngularCoreDecorator(
  context: Rule.RuleContext,
  node: TSESTree.Node | undefined,
  ...names: string[]
): boolean {
  if (node?.type !== 'Decorator' || node.expression.type !== 'CallExpression') {
    return false;
  }
  const callee = node.expression.callee;
  return names.some(
    name =>
      getFullyQualifiedName(context, callee as unknown as estree.Node) ===
      `${ANGULAR_CORE}.${name}`,
  );
}

/** Maps the `TemplateElement` in `` `onRefresh: refresh` `` to its enclosing template. */
function mappingNode(node: TSESTree.Node): TSESTree.Node {
  return node.type === 'TemplateElement' && node.parent?.type === 'TemplateLiteral'
    ? node.parent
    : node;
}

/** Recognizes `@Component({ outputs: ['onRefresh: refresh'] })` mappings. */
function isMetadataOutputMapping(context: Rule.RuleContext, node: TSESTree.Node): boolean {
  const array = mappingNode(node).parent;
  const outputs = array?.parent;
  const metadata = outputs?.parent;
  const componentCall = metadata?.parent;
  const decorator = componentCall?.parent;
  return (
    array?.type === 'ArrayExpression' &&
    outputs?.type === 'Property' &&
    propertyName(outputs) === 'outputs' &&
    metadata?.type === 'ObjectExpression' &&
    componentCall?.type === 'CallExpression' &&
    isAngularCoreDecorator(context, decorator, 'Component', 'Directive')
  );
}

/** Recognizes `@Directive({ hostDirectives: [{ outputs: ['onRefresh: refresh'] }] })` mappings. */
function isHostDirectiveOutputMapping(context: Rule.RuleContext, node: TSESTree.Node): boolean {
  const outputsArray = mappingNode(node).parent;
  const outputs = outputsArray?.parent;
  const hostDirective = outputs?.parent;
  const hostDirectivesArray = hostDirective?.parent;
  const hostDirectives = hostDirectivesArray?.parent;
  const metadata = hostDirectives?.parent;
  const componentCall = metadata?.parent;
  const decorator = componentCall?.parent;
  return (
    outputsArray?.type === 'ArrayExpression' &&
    outputs?.type === 'Property' &&
    propertyName(outputs) === 'outputs' &&
    hostDirective?.type === 'ObjectExpression' &&
    hostDirectivesArray?.type === 'ArrayExpression' &&
    hostDirectives?.type === 'Property' &&
    propertyName(hostDirectives) === 'hostDirectives' &&
    metadata?.type === 'ObjectExpression' &&
    componentCall?.type === 'CallExpression' &&
    isAngularCoreDecorator(context, decorator, 'Component', 'Directive')
  );
}

/** Reads `refresh` from an already-recognized `onRefresh: refresh` metadata mapping. */
function outputAliasFromMetadata(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): string | undefined {
  if (!isMetadataOutputMapping(context, node) && !isHostDirectiveOutputMapping(context, node)) {
    return undefined;
  }
  const mapping = staticText(node);
  const separator = mapping?.indexOf(':') ?? -1;
  if (separator <= 0 || mapping?.indexOf(':', separator + 1) !== -1) {
    return undefined;
  }
  const internalName = mapping.slice(0, separator).trim();
  const alias = mapping.slice(separator + 1).trim();
  return internalName && alias ? alias : undefined;
}

/** Returns the explicit public alias for an Angular output declaration or metadata mapping. */
export function getAngularOutputAlias(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): string | undefined {
  const member = node.parent;
  if (
    (member?.type === 'PropertyDefinition' || member?.type === 'MethodDefinition') &&
    member.key === node
  ) {
    if (member.type === 'PropertyDefinition') {
      return outputAliasFromCall(context, member) ?? outputAliasFromDecorator(context, member);
    }
    return member.kind === 'get' ? outputAliasFromDecorator(context, member) : undefined;
  }
  return outputAliasFromMetadata(context, node);
}
