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
import {
  getAngularMetadataOutput,
  getAngularOutputDecoratorAlias,
  getAngularOutputAlias,
  getAngularStaticOutputNames,
  isAngularOutputCall,
} from '../helpers/angular.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { childrenOf } from '../helpers/ancestor.js';
import { unwrapTypeScriptExpression } from '../helpers/ast.js';

/** Mirrors the delegated rule: `online` is compliant, while `onSave` is not. */
function isCompliantAlias(alias: string | undefined): boolean {
  return alias !== undefined && !/^on(([^a-z])|(?=$))/.test(alias);
}

/** Suppresses `onRefresh = output({ alias: 'refresh' })` when its public alias is compliant. */
function isCompliantOutputAlias(context: Rule.RuleContext, node: estree.Node): boolean {
  return isCompliantAlias(getAngularOutputAlias(context, node as unknown as TSESTree.Node));
}

interface ReportedOutputMember {
  member: TSESTree.PropertyDefinition;
  isMetadataOutput: boolean;
}

interface ClassInfo {
  members: Map<string, { member: TSESTree.PropertyDefinition; index: number }>;
  outputCounts: Map<string, number>;
  replacementOwners: Set<string>;
}

type ClassInfoCache = WeakMap<TSESTree.ClassDeclaration, ClassInfo | null>;

/** Maps a report on `onRefresh = output()` or `outputs: ['onRefresh']` to its declared field. */
function getReportedOutputMember(
  context: Rule.RuleContext,
  node: TSESTree.Node,
  cache: ClassInfoCache,
): ReportedOutputMember | undefined {
  const directMember = node.parent;
  if (
    node.type === 'Identifier' &&
    directMember?.type === 'PropertyDefinition' &&
    directMember.key === node &&
    !directMember.computed &&
    !directMember.static &&
    isAngularOutputCall(context, directMember)
  ) {
    return { member: directMember, isMetadataOutput: false };
  }

  const metadataOutput = getAngularMetadataOutput(context, node);
  if (metadataOutput === undefined || metadataOutput.name.includes(':')) {
    return undefined;
  }
  const { classNode, name: outputName } = metadataOutput;
  const member = getClassInfo(context, classNode, cache)?.members.get(outputName)?.member;
  return member ? { member, isMetadataOutput: true } : undefined;
}

/** Recognizes `onRefresh = output()` when its preceding JSDoc includes `@deprecated`. */
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

/** Recognizes the later sibling `refresh = this.onRefresh` as a direct compliant replacement. */
function isDirectReplacement(
  context: Rule.RuleContext,
  member: TSESTree.PropertyDefinition,
  ownerName: string,
): member is TSESTree.PropertyDefinition & { key: TSESTree.Identifier } {
  const outputAlias = getAngularOutputDecoratorAlias(context, member);
  return (
    !member.computed &&
    !member.static &&
    member.key.type === 'Identifier' &&
    isCompliantAlias(member.key.name) &&
    member.value?.type === 'MemberExpression' &&
    !member.value.computed &&
    member.value.object.type === 'ThisExpression' &&
    member.value.property.type === 'Identifier' &&
    member.value.property.name === ownerName &&
    (outputAlias === null ||
      (outputAlias !== undefined && outputAlias !== '' && isCompliantAlias(outputAlias)))
  );
}

/** Records direct instance writes; an unknown computed name makes the pair uncertain. */
function recordInstanceWrite(target: estree.Node, writes: Set<string | undefined>): void {
  target = unwrapTypeScriptExpression(target);
  switch (target.type) {
    case 'MemberExpression':
      if (unwrapTypeScriptExpression(target.object).type === 'ThisExpression') {
        const property = unwrapTypeScriptExpression(target.property);
        if (!target.computed && property.type === 'Identifier') {
          writes.add(property.name);
        } else if (property.type === 'Literal' && typeof property.value === 'string') {
          writes.add(property.value);
        } else if (property.type === 'TemplateLiteral' && property.expressions.length === 0) {
          writes.add(property.quasis[0].value.cooked ?? undefined);
        } else {
          writes.add(undefined);
        }
      }
      break;
    case 'ArrayPattern':
      target.elements.forEach(element => element && recordInstanceWrite(element, writes));
      break;
    case 'ObjectPattern':
      target.properties.forEach(property =>
        recordInstanceWrite(
          property.type === 'Property' ? property.value : property.argument,
          writes,
        ),
      );
      break;
    case 'AssignmentPattern':
      recordInstanceWrite(target.left, writes);
      break;
    case 'RestElement':
      recordInstanceWrite(target.argument, writes);
      break;
  }
}

/** Instance writes can break emitter sharing; arrows retain the instance's `this`. */
function getInstanceWrites(
  context: Rule.RuleContext,
  classNode: TSESTree.ClassDeclaration,
): Set<string | undefined> {
  const writes = new Set<string | undefined>();
  const nodes = classNode.body.body.flatMap(member => {
    if (member.type === 'PropertyDefinition' && !member.static && member.value) {
      return [member.value as estree.Node];
    }
    if (member.type === 'MethodDefinition' && !member.static && member.value.body) {
      return [member.value.body, ...member.value.params] as estree.Node[];
    }
    return [];
  });
  while (nodes.length > 0) {
    const node = nodes.pop()!;
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ClassDeclaration' ||
      node.type === 'ClassExpression'
    ) {
      continue;
    }
    if (node.type === 'AssignmentExpression') {
      recordInstanceWrite(node.left, writes);
    } else if (
      node.type === 'UpdateExpression' ||
      (node.type === 'UnaryExpression' && node.operator === 'delete')
    ) {
      recordInstanceWrite(node.argument, writes);
    }
    nodes.push(...childrenOf(node, context.sourceCode.visitorKeys));
  }
  return writes;
}

/** Validates a class once and indexes its later, explicitly exposed replacement fields. */
function buildClassInfo(
  context: Rule.RuleContext,
  classNode: TSESTree.ClassDeclaration,
): ClassInfo | undefined {
  // Limit compatibility suppression to simple, unique instance fields.
  const members: ClassInfo['members'] = new Map();
  for (const [index, field] of classNode.body.body.entries()) {
    if (field.type !== 'PropertyDefinition' || field.static) {
      continue;
    }
    if (field.computed || field.key.type !== 'Identifier' || members.has(field.key.name)) {
      return undefined;
    }
    members.set(field.key.name, { member: field, index });
  }
  const outputNames = getAngularStaticOutputNames(context, classNode);
  if (outputNames === undefined) {
    return undefined;
  }
  const outputCounts = new Map<string, number>();
  for (const name of outputNames) {
    outputCounts.set(name, (outputCounts.get(name) ?? 0) + 1);
  }
  const instanceWrites = getInstanceWrites(context, classNode);
  if (instanceWrites.has(undefined)) {
    return undefined;
  }
  const replacementOwners = new Set<string>();
  for (const [name, { member, index }] of members) {
    const value = member.value;
    if (value?.type !== 'MemberExpression' || value.property.type !== 'Identifier') {
      continue;
    }
    const ownerName = value.property.name;
    const ownerIndex = members.get(ownerName)?.index;
    if (
      ownerIndex !== undefined &&
      ownerIndex < index &&
      outputCounts.get(name) === 1 &&
      !instanceWrites.has(name) &&
      !instanceWrites.has(ownerName) &&
      isDirectReplacement(context, member, ownerName)
    ) {
      replacementOwners.add(ownerName);
    }
  }
  return { members, outputCounts, replacementOwners };
}

function getClassInfo(
  context: Rule.RuleContext,
  classNode: TSESTree.ClassDeclaration,
  cache: ClassInfoCache,
): ClassInfo | undefined {
  let info = cache.get(classNode);
  if (info === undefined) {
    info = buildClassInfo(context, classNode) ?? null;
    cache.set(classNode, info);
  }
  return info ?? undefined;
}

/** Suppresses a documented `onRefresh` only for `refresh = this.onRefresh` in the same class. */
function isDeprecatedOutputReplacement(
  context: Rule.RuleContext,
  node: estree.Node,
  cache: ClassInfoCache,
): boolean {
  const reported = getReportedOutputMember(context, node as TSESTree.Node, cache);
  const member = reported?.member;
  if (member?.key.type !== 'Identifier' || !hasDeprecatedJsdoc(context, member)) {
    return false;
  }
  const classNode = member.parent?.parent;
  if (classNode?.type !== 'ClassDeclaration') {
    return false;
  }
  const info = getClassInfo(context, classNode, cache);
  if (info === undefined) {
    return false;
  }
  const ownerName = member.key.name;
  if (reported?.isMetadataOutput && info.outputCounts.get(ownerName) !== 1) {
    return false;
  }
  return info.replacementOwners.has(ownerName);
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    create(context) {
      const cache: ClassInfoCache = new WeakMap();
      return interceptReport(rule, (context, reportDescriptor) => {
        if (
          !('node' in reportDescriptor) ||
          (!isCompliantOutputAlias(context, reportDescriptor.node) &&
            !isDeprecatedOutputReplacement(context, reportDescriptor.node, cache))
        ) {
          context.report(reportDescriptor);
        }
      }).create(context);
    },
  };
}
