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
import { isStringLiteral } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { getFullyQualifiedName } from '../helpers/module.js';

const ANGULAR_CORE = '@angular.core';

function isCompliantAlias(alias: string | undefined): boolean {
  return alias !== undefined && !/^on(([^a-z])|(?=$))/.test(alias);
}

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

function propertyName(property: TSESTree.Property): string | undefined {
  return !property.computed && property.key.type === 'Identifier' ? property.key.name : undefined;
}

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

function outputAliasFromProperty(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): string | undefined {
  const member = node.parent;
  if (
    (member?.type !== 'PropertyDefinition' && member?.type !== 'MethodDefinition') ||
    member.key !== node
  ) {
    return undefined;
  }
  return member.type === 'PropertyDefinition'
    ? (outputAliasFromCall(context, member) ?? outputAliasFromDecorator(context, member))
    : member.kind === 'get'
      ? outputAliasFromDecorator(context, member)
      : undefined;
}

function isComponentOrDirectiveDecorator(
  context: Rule.RuleContext,
  node: TSESTree.Node | undefined,
): boolean {
  return (
    node?.type === 'Decorator' &&
    node.expression.type === 'CallExpression' &&
    ['Component', 'Directive'].some(
      name =>
        getFullyQualifiedName(context, node.expression.callee as unknown as estree.Node) ===
        `${ANGULAR_CORE}.${name}`,
    )
  );
}

function mappingNode(node: TSESTree.Node): TSESTree.Node {
  return node.type === 'TemplateElement' && node.parent?.type === 'TemplateLiteral'
    ? node.parent
    : node;
}

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
    isComponentOrDirectiveDecorator(context, decorator)
  );
}

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
    isComponentOrDirectiveDecorator(context, decorator)
  );
}

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

function isCompliantOutputAlias(context: Rule.RuleContext, node: estree.Node): boolean {
  const astNode = node as TSESTree.Node;
  return isCompliantAlias(
    outputAliasFromProperty(context, astNode) ?? outputAliasFromMetadata(context, astNode),
  );
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, reportDescriptor) => {
    if (!('node' in reportDescriptor) || !isCompliantOutputAlias(context, reportDescriptor.node)) {
      context.report(reportDescriptor);
    }
  });
}
