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

export interface AngularMetadataOutput {
  classNode: TSESTree.ClassDeclaration;
  name: string;
}

/** Returns text from `'refresh'` or `` `refresh` ``, but never from dynamic expressions. */
function staticText(node: TSESTree.Node | undefined): string | undefined {
  if (node && isStringLiteral(node as unknown as estree.Node)) {
    return (node as unknown as estree.Literal).value as string;
  }
  if (node?.type === 'TemplateLiteral') {
    if (node.expressions.length !== 0 || node.quasis.length !== 1) {
      return undefined;
    }
    const decodedText = node.quasis[0].value.cooked;
    return decodedText ?? undefined;
  }
  if (node?.type === 'TemplateElement' && node.parent?.type === 'TemplateLiteral') {
    const template = node.parent;
    if (template.expressions.length !== 0 || template.quasis.length !== 1) {
      return undefined;
    }
    const decodedText = node.value.cooked;
    return decodedText ?? undefined;
  }
  return undefined;
}

/** Accepts only direct keys such as `{ alias: 'refresh' }`, not computed properties. */
function propertyName(property: TSESTree.Property): string | undefined {
  return !property.computed && property.key.type === 'Identifier' ? property.key.name : undefined;
}

/** Accepts direct identifier or string keys such as `{ 'alias': 'refresh' }`. */
function optionPropertyName(property: TSESTree.Property): string | undefined {
  if (property.computed) {
    return undefined;
  }
  return propertyName(property) ?? staticText(property.key as TSESTree.Node);
}

/** Recognizes the Angular `output({ alias: 'refresh' })` property initializer. */
function outputAliasFromCall(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition,
): string | undefined {
  const call = member.value;
  if (call?.type !== 'CallExpression' || !isAngularOutputCall(context, member)) {
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
  const aliases = properties.filter(property => optionPropertyName(property) === 'alias');
  return aliases.length === 1 ? staticText(aliases[0].value) : undefined;
}

/** Recognizes an Angular `output()` property initializer. */
export function isAngularOutputCall(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition,
): boolean {
  return (
    member.value?.type === 'CallExpression' &&
    getFullyQualifiedName(context, member.value.callee as unknown as estree.Node) ===
      `${ANGULAR_CORE}.output`
  );
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
  const alias =
    expression?.type === 'CallExpression' ? staticText(expression.arguments[0]) : undefined;
  return alias || undefined;
}

function hasOutputDecorator(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition | TSESTree.MethodDefinition,
): boolean {
  return member.decorators.some(decorator => {
    const expression = decorator.expression;
    return (
      expression.type === 'CallExpression' &&
      getFullyQualifiedName(context, expression.callee as unknown as estree.Node) ===
        `${ANGULAR_CORE}.Output`
    );
  });
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
  return getMetadataOutputClass(context, node) !== undefined;
}

/** Returns the class that declares a direct static Angular `outputs` entry. */
function getMetadataOutputClass(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): TSESTree.ClassDeclaration | undefined {
  const mapping = mappingNode(node);
  const array = mapping.parent;
  const outputs = array?.parent;
  const metadata = outputs?.parent;
  const componentCall = metadata?.parent;
  const decorator = componentCall?.parent;
  const classNode = decorator?.parent;
  return array?.type === 'ArrayExpression' &&
    outputs?.type === 'Property' &&
    propertyName(outputs) === 'outputs' &&
    metadata?.type === 'ObjectExpression' &&
    componentCall?.type === 'CallExpression' &&
    isAngularCoreDecorator(context, decorator, 'Component', 'Directive') &&
    classNode?.type === 'ClassDeclaration'
    ? classNode
    : undefined;
}

/** Returns the metadata output name and its declaring class for a direct static `outputs` entry. */
export function getAngularMetadataOutput(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): AngularMetadataOutput | undefined {
  const name = staticText(node);
  const classNode = getMetadataOutputClass(context, node);
  return name !== undefined && classNode !== undefined ? { classNode, name } : undefined;
}

/** Returns every name in complete static `outputs` metadata, or `undefined` for unsupported forms. */
export function getAngularStaticOutputNames(
  context: Rule.RuleContext,
  classNode: TSESTree.ClassDeclaration,
): string[] | undefined {
  const decorator = classNode.decorators.find(decorator =>
    isAngularCoreDecorator(context, decorator, 'Component', 'Directive'),
  );
  const componentCall = decorator?.expression;
  if (componentCall?.type !== 'CallExpression' || componentCall.arguments.length !== 1) {
    return undefined;
  }
  const argument = componentCall.arguments[0];
  if (argument?.type !== 'ObjectExpression' || argument.properties.some(isNotProperty)) {
    return undefined;
  }
  const outputs = (argument.properties as TSESTree.Property[]).filter(
    property => propertyName(property) === 'outputs',
  );
  if (outputs.length !== 1 || outputs[0].value.type !== 'ArrayExpression') {
    return undefined;
  }
  const names = outputs[0].value.elements.map(element =>
    element ? staticText(element as TSESTree.Node) : undefined,
  );
  return names.some(name => name === undefined || name.includes(':'))
    ? undefined
    : (names as string[]);
}

function isNotProperty(node: TSESTree.Property | TSESTree.SpreadElement): boolean {
  return node.type !== 'Property';
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

/** Returns a member decorator's alias when it overrides an `outputs` metadata entry. */
function overridingMemberOutputAlias(
  context: Rule.RuleContext,
  node: TSESTree.Node,
  internalName: string,
): string | undefined | null {
  const mapping = mappingNode(node);
  const classDeclaration = mapping.parent?.parent?.parent?.parent?.parent?.parent;
  if (classDeclaration?.type !== 'ClassDeclaration') {
    return null;
  }
  const member = classDeclaration.body.body.find(
    candidate =>
      (candidate.type === 'PropertyDefinition' || candidate.type === 'MethodDefinition') &&
      !candidate.computed &&
      candidate.key.type === 'Identifier' &&
      candidate.key.name === internalName &&
      hasOutputDecorator(context, candidate),
  );
  return member && (member.type === 'PropertyDefinition' || member.type === 'MethodDefinition')
    ? outputAliasFromDecorator(context, member)
    : null;
}

/** Reads `refresh` from an already-recognized `onRefresh: refresh` metadata mapping. */
function outputAliasFromMetadata(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): string | undefined {
  const isMetadataMapping = isMetadataOutputMapping(context, node);
  if (!isMetadataMapping && !isHostDirectiveOutputMapping(context, node)) {
    return undefined;
  }
  const mapping = staticText(node);
  const separator = mapping?.indexOf(':') ?? -1;
  if (separator === 0 || mapping?.indexOf(':', separator + 1) !== -1) {
    return undefined;
  }
  const internalName = separator === -1 ? mapping?.trim() : mapping?.slice(0, separator).trim();
  const alias = separator === -1 ? internalName : mapping?.slice(separator + 1).trim();
  if (!internalName || !alias) {
    return undefined;
  }
  const memberAlias = isMetadataMapping
    ? overridingMemberOutputAlias(context, node, internalName)
    : null;
  return memberAlias === null ? alias : memberAlias;
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
