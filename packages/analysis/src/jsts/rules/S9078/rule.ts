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
// https://sonarsource.github.io/rspec/#/rspec/S9078/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import {
  getParameterizedTestFrameworks,
  hasSupportedParameterizedCallback,
  isSupportedParameterizedDeclaration,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const messages = {
  duplicate: 'Remove this duplicate test case.',
} as const;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, fixable: 'code' }),

  create(context: Rule.RuleContext) {
    const activeFrameworks = getParameterizedTestFrameworks(context);

    if (!Object.values(activeFrameworks).some(Boolean)) {
      return {};
    }

    return {
      CallExpression(node: estree.CallExpression) {
        const dataset = getDataset(node);
        if (
          dataset === undefined ||
          !hasSupportedParameterizedCallback(context, node) ||
          node.arguments.length < 2 ||
          !isSupportedParameterizedDeclaration(context, node, activeFrameworks)
        ) {
          return;
        }

        reportDuplicateRows(context, dataset);
      },
    };
  },
};

function reportDuplicateRows(context: Rule.RuleContext, dataset: estree.ArrayExpression): void {
  const rowGroups: { original: estree.Node; duplicates: { index: number; node: estree.Node }[] }[] =
    [];

  dataset.elements.forEach((element, index) => {
    if (element === null || element.type === 'SpreadElement') {
      return;
    }

    const group = rowGroups.find(row => areEquivalent(row.original, element, context.sourceCode));
    if (group === undefined) {
      rowGroups.push({ original: element, duplicates: [] });
      return;
    }

    group.duplicates.push({ index, node: element });
  });

  const duplicateGroups = rowGroups.filter(group => group.duplicates.length > 0);

  for (const { original, duplicates } of duplicateGroups) {
    const [firstDuplicate] = duplicates;
    if (firstDuplicate === undefined) {
      continue;
    }
    report(
      context,
      {
        node: firstDuplicate.node,
        message: messages.duplicate,
        messageId: 'duplicate',
        fix: fixer => removeDuplicateRows(fixer, context.sourceCode, duplicates),
      },
      [
        toSecondaryLocation(original, 'Original test case.'),
        ...duplicates
          .slice(1)
          .map(duplicate => toSecondaryLocation(duplicate.node, 'Additional duplicate test case.')),
      ],
    );
  }
}

function removeDuplicateRows(
  fixer: Rule.RuleFixer,
  sourceCode: Rule.RuleContext['sourceCode'],
  duplicates: { index: number; node: estree.Node }[],
): Rule.Fix[] {
  const fixes: Rule.Fix[] = [];
  for (let position = 0; position < duplicates.length;) {
    const firstDuplicate = duplicates[position];
    let lastDuplicate = firstDuplicate;
    position++;
    while (duplicates[position]?.index === lastDuplicate.index + 1) {
      lastDuplicate = duplicates[position];
      position++;
    }
    fixes.push(removeDuplicateRow(fixer, sourceCode, firstDuplicate.node, lastDuplicate.node));
  }
  return fixes;
}

function removeDuplicateRow(
  fixer: Rule.RuleFixer,
  sourceCode: Rule.RuleContext['sourceCode'],
  firstElement: estree.Node,
  lastElement: estree.Node,
): Rule.Fix {
  const firstElementRange = sourceCode.getRange(firstElement);
  const lastElementRange = sourceCode.getRange(lastElement);
  const previousToken = sourceCode.getTokenBefore(firstElement);
  const removalStart = getRemovalStart(sourceCode, firstElement, firstElementRange);
  const trailingCommentEnd = getTrailingCommentEnd(sourceCode, lastElement);

  if (trailingCommentEnd !== undefined) {
    const trailingNewline = /^\s*(\r?\n)/.exec(sourceCode.text.slice(trailingCommentEnd));
    const end = trailingNewline
      ? trailingCommentEnd + trailingNewline[0].length
      : trailingCommentEnd;
    return fixer.removeRange([removalStart, end]);
  }

  if (hasCommentBefore(sourceCode, firstElement, previousToken)) {
    const nextToken = sourceCode.getTokenAfter(lastElement);
    const end = nextToken?.value === ',' ? nextToken.range[1] : lastElementRange[1];
    const trailingNewline = /^\s*(\r?\n)/.exec(sourceCode.text.slice(end));
    const endWithNewline = trailingNewline ? end + trailingNewline[0].length : end;
    return fixer.removeRange([removalStart, endWithNewline]);
  }

  const start = previousToken?.value === ',' ? previousToken.range[0] : firstElementRange[0];
  return fixer.removeRange([start, lastElementRange[1]]);
}

function getRemovalStart(
  sourceCode: Rule.RuleContext['sourceCode'],
  firstElement: estree.Node,
  firstElementRange: [number, number],
): number {
  const standaloneLeadingCommentStart = getStandaloneLeadingCommentStart(sourceCode, firstElement);
  if (standaloneLeadingCommentStart !== undefined) {
    return standaloneLeadingCommentStart;
  }

  const lineStart = sourceCode.getIndexFromLoc({
    line: sourceCode.getLoc(firstElement).start.line,
    column: 0,
  });
  const isOnlyElementOnLine = /^\s*$/.test(sourceCode.text.slice(lineStart, firstElementRange[0]));
  return isOnlyElementOnLine ? lineStart : firstElementRange[0];
}

function hasCommentBefore(
  sourceCode: Rule.RuleContext['sourceCode'],
  firstElement: estree.Node,
  previousToken: ReturnType<Rule.RuleContext['sourceCode']['getTokenBefore']>,
): boolean {
  return sourceCode.getTokenBefore(firstElement, { includeComments: true }) !== previousToken;
}

function getTrailingCommentEnd(
  sourceCode: Rule.RuleContext['sourceCode'],
  lastElement: estree.Node,
): number | undefined {
  const nextToken = sourceCode.getTokenAfter(lastElement, { includeComments: true });
  const possibleTrailingComment =
    nextToken?.value === ','
      ? sourceCode.getTokenAfter(nextToken, { includeComments: true })
      : nextToken;
  if (possibleTrailingComment?.type !== 'Line' && possibleTrailingComment?.type !== 'Block') {
    return undefined;
  }

  if (
    possibleTrailingComment.loc?.start.line !== sourceCode.getLoc(lastElement).end.line ||
    possibleTrailingComment.range === undefined
  ) {
    return undefined;
  }
  return possibleTrailingComment.range[1];
}

function getStandaloneLeadingCommentStart(
  sourceCode: Rule.RuleContext['sourceCode'],
  firstElement: estree.Node,
): number | undefined {
  const [comment] = sourceCode.getCommentsBefore(firstElement).slice(-1);
  const firstElementRange = sourceCode.getRange(firstElement);
  if (comment === undefined) {
    return undefined;
  }
  if (
    comment.range === undefined ||
    comment.loc?.start.line === undefined ||
    comment.loc.end.line >= sourceCode.getLoc(firstElement).start.line
  ) {
    return undefined;
  }

  const commentLineStart = sourceCode.getIndexFromLoc({
    line: comment.loc.start.line,
    column: 0,
  });
  const beforeComment = sourceCode.text.slice(commentLineStart, comment.range[0]);
  const afterComment = sourceCode.text.slice(comment.range[1], firstElementRange[0]);
  return /^\s*$/.test(beforeComment) && /^\s*$/.test(afterComment) ? commentLineStart : undefined;
}

function getDataset(node: estree.CallExpression): estree.ArrayExpression | undefined {
  if (node.callee.type !== 'CallExpression') {
    return undefined;
  }

  const { callee, arguments: args } = node.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'each' ||
    args.length === 0
  ) {
    return undefined;
  }

  const [dataset] = args;
  if (dataset === undefined || dataset.type === 'SpreadElement') {
    return undefined;
  }

  const unwrapped = unwrapTypeScriptExpression(dataset);
  return unwrapped.type === 'ArrayExpression' ? unwrapped : undefined;
}

function unwrapTypeScriptExpression(node: estree.Node): estree.Node {
  let unwrapped = node as unknown as TSESTree.Node;
  while (
    unwrapped.type === 'TSNonNullExpression' ||
    unwrapped.type === 'TSAsExpression' ||
    unwrapped.type === 'TSSatisfiesExpression' ||
    unwrapped.type === 'TSTypeAssertion'
  ) {
    unwrapped = unwrapped.expression;
  }
  return unwrapped as unknown as estree.Node;
}
