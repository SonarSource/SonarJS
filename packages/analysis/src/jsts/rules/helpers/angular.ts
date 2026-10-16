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
import { ASTUtils } from '@angular-eslint/utils';
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

/** Returns static text from `'refresh'` or `` `refresh` ``, e.g. `outputs: ['refresh']`. */
export function staticText(node: TSESTree.Node | undefined): string | undefined {
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

/** Reads a direct identifier key, e.g. `outputs: ['refresh']`, but not `{ [name]: [] }`. */
function propertyName(property: TSESTree.Property): string | undefined {
  return !property.computed && property.key.type === 'Identifier' ? property.key.name : undefined;
}

/** Reads direct option keys, e.g. `{ alias: 'refresh' }` or `{ 'alias': 'refresh' }`. */
function optionPropertyName(property: TSESTree.Property): string | undefined {
  if (property.computed) {
    return undefined;
  }
  return propertyName(property) ?? staticText(property.key as TSESTree.Node);
}

/** Reads the public alias in `refresh = output({ alias: 'publicRefresh' })`. */
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

/** Recognizes the Angular property initializer `refresh = output()`. */
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

/**
 * Returns the public name from `@Output('publicRefresh') refresh = new EventEmitter()`.
 *
 * Returns the member name for `@Output() refresh`, `null` without an `@Output` decorator,
 * and `undefined` when the decorator argument is not statically known.
 */
export function getAngularOutputDecoratorAlias(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition | TSESTree.MethodDefinition,
): string | undefined | null {
  const outputDecorator = member.decorators.find(decorator => {
    const expression = decorator.expression;
    return (
      expression.type === 'CallExpression' &&
      getFullyQualifiedName(context, expression.callee as unknown as estree.Node) ===
        `${ANGULAR_CORE}.Output`
    );
  });
  const expression = outputDecorator?.expression;
  if (expression?.type !== 'CallExpression') {
    return null;
  }
  if (expression.arguments.length === 0) {
    return !member.computed && member.key.type === 'Identifier' ? member.key.name : undefined;
  }
  return expression.arguments.length === 1 ? staticText(expression.arguments[0]) : undefined;
}

/** Reads the explicit public alias from `@Output('publicRefresh') refresh = new EventEmitter()`. */
function outputAliasFromDecorator(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition | TSESTree.MethodDefinition,
): string | undefined {
  return getAngularOutputDecoratorAlias(context, member) || undefined;
}

/** Recognizes Angular decorators such as `@Component({ outputs: [] })` or `@Directive({})`. */
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

/** Maps the template element in `` `onRefresh: refresh` `` to its enclosing template literal. */
function mappingNode(node: TSESTree.Node): TSESTree.Node {
  return node.type === 'TemplateElement' && node.parent?.type === 'TemplateLiteral'
    ? node.parent
    : node;
}

/** Finds the decorator containing a direct `outputs` metadata mapping. */
function outputMetadataDecorator(node: TSESTree.Node): TSESTree.Decorator | undefined {
  const array = mappingNode(node).parent;
  const outputs = array?.parent;
  const metadata = outputs?.parent;
  const componentCall = metadata?.parent;
  const decorator = componentCall?.parent;
  return array?.type === 'ArrayExpression' &&
    outputs?.type === 'Property' &&
    outputs.value === array &&
    (propertyName(outputs) ?? staticText(outputs.key)) === 'outputs' &&
    metadata?.type === 'ObjectExpression' &&
    componentCall?.type === 'CallExpression' &&
    componentCall.arguments[0] === metadata &&
    decorator?.type === 'Decorator'
    ? decorator
    : undefined;
}

/** Recognizes the direct metadata entry in `@Component({ outputs: ['onRefresh: refresh'] })`. */
function isMetadataOutputMapping(context: Rule.RuleContext, node: TSESTree.Node): boolean {
  return getMetadataOutputClass(context, node) !== undefined;
}

/** Returns the class for `@Component({ outputs: ['refresh'] }) class C {}`. */
function getMetadataOutputClass(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): TSESTree.ClassDeclaration | undefined {
  const decorator = outputMetadataDecorator(node);
  const classNode = decorator?.parent;
  return isAngularCoreDecorator(context, decorator, 'Component', 'Directive') &&
    classNode?.type === 'ClassDeclaration'
    ? classNode
    : undefined;
}

/** Returns `refresh` and `C` from `@Component({ outputs: ['refresh'] }) class C {}`. */
export function getAngularMetadataOutput(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): AngularMetadataOutput | undefined {
  const name = staticText(node)?.trim();
  const classNode = getMetadataOutputClass(context, node);
  return name !== undefined && classNode !== undefined ? { classNode, name } : undefined;
}

/** Returns `['refresh']` from `@Component({ outputs: ['refresh'] })`, never dynamic metadata. */
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
    property => optionPropertyName(property) === 'outputs',
  );
  if (
    outputs.length !== 1 ||
    propertyName(outputs[0]) !== 'outputs' ||
    outputs[0].value.type !== 'ArrayExpression'
  ) {
    return undefined;
  }
  const names = outputs[0].value.elements.map(element =>
    element ? staticText(element as TSESTree.Node)?.trim() : undefined,
  );
  return names.some(name => name === undefined || name.includes(':'))
    ? undefined
    : (names as string[]);
}

/** Detects a spread or computed key, e.g. `@Component({ ...metadata, [key]: [] })`. */
function isNotProperty(node: TSESTree.Property | TSESTree.SpreadElement): boolean {
  return node.type !== 'Property' || node.computed;
}

/** Recognizes `@Directive({ hostDirectives: [{ outputs: ['onRefresh: refresh'] }] })`. */
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

/** Reads `@Output('publicRefresh') refresh` when it overrides `outputs: ['refresh']`. */
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
      getAngularOutputDecoratorAlias(context, candidate) !== null,
  );
  return member && (member.type === 'PropertyDefinition' || member.type === 'MethodDefinition')
    ? outputAliasFromDecorator(context, member)
    : null;
}

/** Reads member and public names from a static output metadata entry. */
function parseOutputMapping(mapping: string | undefined): [string, string] | undefined {
  const separator = mapping?.indexOf(':') ?? -1;
  if (separator === 0 || mapping?.indexOf(':', separator + 1) !== -1) {
    return undefined;
  }
  const internalName = separator === -1 ? mapping?.trim() : mapping?.slice(0, separator).trim();
  const alias = separator === -1 ? internalName : mapping?.slice(separator + 1).trim();
  return internalName && alias ? [internalName, alias] : undefined;
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
  const names = parseOutputMapping(staticText(node));
  if (!names) {
    return undefined;
  }
  const [internalName, alias] = names;
  const memberAlias = isMetadataMapping
    ? overridingMemberOutputAlias(context, node, internalName)
    : null;
  if (memberAlias === undefined) {
    return undefined;
  }
  return memberAlias ?? alias;
}

/** Reads static member and public names from an upstream output-alias report. */
export function getAngularOutputNames(node: TSESTree.Node): [string, string] | undefined {
  const text = staticText(node);
  if (text === undefined) {
    return undefined;
  }
  let alias = mappingNode(node);
  while (alias.parent?.type === 'TSAsExpression' || alias.parent?.type === 'TSNonNullExpression') {
    alias = alias.parent;
  }
  if (alias.parent?.type === 'ArrayExpression') {
    const decorator = outputMetadataDecorator(alias);
    const name = decorator && ASTUtils.getDecoratorName(decorator);
    return name === 'Component' || name === 'Directive' ? parseOutputMapping(text) : undefined;
  }
  if (!isCompleteOutputAlias(alias)) {
    return undefined;
  }
  const member = ASTUtils.getNearestNodeFrom(node, ASTUtils.isPropertyOrMethodDefinition);
  return member && !member.computed && member.key.type === 'Identifier'
    ? [member.key.name, text]
    : undefined;
}

/** A literal inside a lookup or another expression is not the complete public alias. */
function isCompleteOutputAlias(node: TSESTree.Node): boolean {
  const alias = mappingNode(node);
  const parent = alias.parent;
  if (parent?.type === 'CallExpression') {
    return parent.arguments[0] === alias && parent.parent.type === 'Decorator';
  }
  if (
    parent?.type !== 'Property' ||
    parent.value !== alias ||
    optionPropertyName(parent) !== 'alias'
  ) {
    return false;
  }
  const options = parent.parent;
  const call = options.parent;
  return (
    options.type === 'ObjectExpression' &&
    call.type === 'CallExpression' &&
    call.arguments[0] === options &&
    call.parent.type === 'PropertyDefinition' &&
    call.parent.value === call
  );
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
