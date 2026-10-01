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
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type estree from 'estree';
import { isStringLiteral } from '../helpers/ast.js';
import { getAngularOutputAlias } from '../helpers/angular.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { getFullyQualifiedName } from '../helpers/module.js';

const ANGULAR_CORE = '@angular.core';

/** Mirrors the delegated rule: `online` is compliant, while `onSave` is not. */
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

/** Recognizes Angular component decorators such as `@Component({ outputs: [...] })`. */
function isComponentOrDirectiveDecorator(
  context: Rule.RuleContext,
  node: TSESTree.Node | undefined,
): boolean {
  if (node?.type !== 'Decorator' || node.expression.type !== 'CallExpression') {
    return false;
  }
  const decoratorName = getFullyQualifiedName(
    context,
    node.expression.callee as unknown as estree.Node,
  );
  return ['Component', 'Directive'].some(name => decoratorName === `${ANGULAR_CORE}.${name}`);
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
    isComponentOrDirectiveDecorator(context, decorator)
  );
}

/** Suppresses only reports whose checked node has an explicit, compliant public alias. */
function isCompliantOutputAlias(context: Rule.RuleContext, node: estree.Node): boolean {
  return isCompliantAlias(getAngularOutputAlias(context, node as unknown as TSESTree.Node));
}

interface ReportedOutputMember {
  member: TSESTree.PropertyDefinition;
  isMetadataOutput: boolean;
}

function isOutputCall(context: Rule.RuleContext, member: TSESTree.PropertyDefinition): boolean {
  return (
    member.value?.type === 'CallExpression' &&
    getFullyQualifiedName(context, member.value.callee as unknown as estree.Node) ===
      `${ANGULAR_CORE}.output`
  );
}

function getClassDeclaration(member: TSESTree.PropertyDefinition) {
  const classBody = member.parent;
  return classBody?.type === 'ClassBody' && classBody.parent?.type === 'ClassDeclaration'
    ? classBody.parent
    : undefined;
}

function getStaticOutputNames(
  context: Rule.RuleContext,
  classNode: TSESTree.ClassDeclaration,
): string[] | undefined {
  const decorator = classNode.decorators.find(decorator =>
    isComponentOrDirectiveDecorator(context, decorator),
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
  if (names.some(name => name === undefined || name.includes(':'))) {
    return undefined;
  }
  return names as string[];
}

function isNotProperty(node: TSESTree.Property | TSESTree.SpreadElement): boolean {
  return node.type !== 'Property';
}

function getReportedOutputMember(
  context: Rule.RuleContext,
  node: TSESTree.Node,
): ReportedOutputMember | undefined {
  const directMember = node.parent;
  if (
    node.type === 'Identifier' &&
    directMember?.type === 'PropertyDefinition' &&
    directMember.key === node &&
    !directMember.computed &&
    !directMember.static &&
    isOutputCall(context, directMember)
  ) {
    return { member: directMember, isMetadataOutput: false };
  }

  const outputName = staticText(node);
  const array = mappingNode(node).parent;
  const outputs = array?.parent;
  const metadata = outputs?.parent;
  const componentCall = metadata?.parent;
  const decorator = componentCall?.parent;
  const classNode = decorator?.parent;
  if (
    outputName === undefined ||
    outputName.includes(':') ||
    !isMetadataOutputMapping(context, node) ||
    classNode?.type !== 'ClassDeclaration'
  ) {
    return undefined;
  }
  const members = classNode.body.body.filter(
    (member): member is TSESTree.PropertyDefinition =>
      member.type === 'PropertyDefinition' &&
      !member.computed &&
      !member.static &&
      member.key.type === 'Identifier' &&
      member.key.name === outputName,
  );
  return members.length === 1 ? { member: members[0], isMetadataOutput: true } : undefined;
}

function hasDeprecatedJsdoc(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition,
): boolean {
  const comment = context.sourceCode.getCommentsBefore(member as unknown as estree.Node).at(-1);
  return (
    comment?.type === 'Block' &&
    comment.value.startsWith('*') &&
    /@deprecated\b/.test(comment.value)
  );
}

function isDirectReplacement(
  member: TSESTree.PropertyDefinition,
  ownerName: string,
): member is TSESTree.PropertyDefinition & { key: TSESTree.Identifier } {
  return (
    !member.computed &&
    !member.static &&
    member.key.type === 'Identifier' &&
    isCompliantAlias(member.key.name) &&
    member.value?.type === 'MemberExpression' &&
    !member.value.computed &&
    member.value.object.type === 'ThisExpression' &&
    member.value.property.type === 'Identifier' &&
    member.value.property.name === ownerName
  );
}

function isDeprecatedOutputReplacement(context: Rule.RuleContext, node: estree.Node): boolean {
  const reported = getReportedOutputMember(context, node as TSESTree.Node);
  const member = reported?.member;
  if (member?.key.type !== 'Identifier' || !hasDeprecatedJsdoc(context, member)) {
    return false;
  }
  const classNode = getClassDeclaration(member);
  const outputNames = classNode && getStaticOutputNames(context, classNode);
  if (classNode === undefined || outputNames === undefined) {
    return false;
  }
  const ownerName = member.key.name;
  if (reported?.isMetadataOutput && outputNames.filter(name => name === ownerName).length !== 1) {
    return false;
  }
  const memberIndex = classNode.body.body.indexOf(member);
  return classNode.body.body.slice(memberIndex + 1).some(member => {
    if (member.type !== 'PropertyDefinition' || !isDirectReplacement(member, ownerName)) {
      return false;
    }
    return outputNames.filter(name => name === member.key.name).length === 1;
  });
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, reportDescriptor) => {
    if (
      !('node' in reportDescriptor) ||
      (!isCompliantOutputAlias(context, reportDescriptor.node) &&
        !isDeprecatedOutputReplacement(context, reportDescriptor.node))
    ) {
      context.report(reportDescriptor);
    }
  });
}
