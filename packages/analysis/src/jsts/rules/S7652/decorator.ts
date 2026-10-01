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

function isCompliantAlias(alias: string | undefined): boolean {
  return alias !== undefined && !alias.startsWith('on');
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

function outputAliasFromCall(member: TSESTree.PropertyDefinition): string | undefined {
  const call = member.value;
  if (
    call?.type !== 'CallExpression' ||
    call.callee.type !== 'Identifier' ||
    call.callee.name !== 'output'
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

function outputAliasFromDecorator(member: TSESTree.PropertyDefinition): string | undefined {
  const outputDecorator = member.decorators.find(decorator => {
    const expression = decorator.expression;
    return (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier' &&
      expression.callee.name === 'Output'
    );
  });
  const expression = outputDecorator?.expression;
  return expression?.type === 'CallExpression' ? staticText(expression.arguments[0]) : undefined;
}

function outputAliasFromProperty(node: TSESTree.Node): string | undefined {
  const member = node.parent;
  if (member?.type !== 'PropertyDefinition' || member.key !== node) {
    return undefined;
  }
  return outputAliasFromCall(member) ?? outputAliasFromDecorator(member);
}

function isComponentOrDirectiveDecorator(node: TSESTree.Node | undefined): boolean {
  return (
    node?.type === 'Decorator' &&
    node.expression.type === 'CallExpression' &&
    node.expression.callee.type === 'Identifier' &&
    (node.expression.callee.name === 'Component' || node.expression.callee.name === 'Directive')
  );
}

function isMetadataOutputMapping(node: TSESTree.Node): boolean {
  const array = node.parent;
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
    isComponentOrDirectiveDecorator(decorator)
  );
}

function isHostDirectiveOutputMapping(node: TSESTree.Node): boolean {
  const outputsArray = node.parent;
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
    isComponentOrDirectiveDecorator(decorator)
  );
}

function outputAliasFromMetadata(node: TSESTree.Node): string | undefined {
  if (!isMetadataOutputMapping(node) && !isHostDirectiveOutputMapping(node)) {
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

function isCompliantOutputAlias(node: estree.Node): boolean {
  const astNode = node as TSESTree.Node;
  return isCompliantAlias(outputAliasFromProperty(astNode) ?? outputAliasFromMetadata(astNode));
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, reportDescriptor) => {
    if (!('node' in reportDescriptor) || !isCompliantOutputAlias(reportDescriptor.node)) {
      context.report(reportDescriptor);
    }
  });
}
