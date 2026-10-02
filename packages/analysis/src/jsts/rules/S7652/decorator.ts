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
  getAngularOutputAlias,
  getAngularStaticOutputNames,
  isAngularOutputCall,
} from '../helpers/angular.js';
import { findFirstMatchingLocalAncestor } from '../helpers/ancestor.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';

/** Mirrors the delegated rule: `online` is compliant, while `onSave` is not. */
function isCompliantAlias(alias: string | undefined): boolean {
  return alias !== undefined && !/^on(([^a-z])|(?=$))/.test(alias);
}

/** Suppresses only reports whose checked node has an explicit, compliant public alias. */
function isCompliantOutputAlias(context: Rule.RuleContext, node: estree.Node): boolean {
  return isCompliantAlias(getAngularOutputAlias(context, node as unknown as TSESTree.Node));
}

interface ReportedOutputMember {
  member: TSESTree.PropertyDefinition;
  isMetadataOutput: boolean;
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
  const classNode = findFirstMatchingLocalAncestor(
    member,
    node => node.type === 'ClassDeclaration',
  );
  if (classNode?.type !== 'ClassDeclaration') {
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
