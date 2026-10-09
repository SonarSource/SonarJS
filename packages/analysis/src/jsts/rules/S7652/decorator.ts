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

/** Maps a report on `onRefresh = output()` or `outputs: ['onRefresh']` to its declared field. */
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
    isAngularOutputCall(context, directMember)
  ) {
    return { member: directMember, isMetadataOutput: false };
  }

  const metadataOutput = getAngularMetadataOutput(context, node);
  if (metadataOutput === undefined || metadataOutput.name.includes(':')) {
    return undefined;
  }
  const { classNode, name: outputName } = metadataOutput;
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

/** Suppresses a documented `onRefresh` only for `refresh = this.onRefresh` in the same class. */
function isDeprecatedOutputReplacement(context: Rule.RuleContext, node: estree.Node): boolean {
  const reported = getReportedOutputMember(context, node as TSESTree.Node);
  const member = reported?.member;
  if (member?.key.type !== 'Identifier' || !hasDeprecatedJsdoc(context, member)) {
    return false;
  }
  const classNode = member.parent?.parent;
  if (classNode?.type !== 'ClassDeclaration') {
    return false;
  }
  // Limit compatibility suppression to simple, unique instance fields.
  const fieldNames = new Set<string>();
  for (const field of classNode.body.body) {
    if (field.type !== 'PropertyDefinition' || field.static) {
      continue;
    }
    if (field.computed || field.key.type !== 'Identifier' || fieldNames.has(field.key.name)) {
      return false;
    }
    fieldNames.add(field.key.name);
  }
  const memberIndex = classNode.body.body.indexOf(member);
  if (memberIndex < 0) {
    return false;
  }
  const outputNames = getAngularStaticOutputNames(context, classNode);
  if (outputNames === undefined) {
    return false;
  }
  const ownerName = member.key.name;
  if (reported?.isMetadataOutput && outputNames.filter(name => name === ownerName).length !== 1) {
    return false;
  }
  return classNode.body.body.slice(memberIndex + 1).some(member => {
    if (member.type !== 'PropertyDefinition' || !isDirectReplacement(context, member, ownerName)) {
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
