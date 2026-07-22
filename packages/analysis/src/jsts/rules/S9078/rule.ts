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
import {
  getParameterizedTestFrameworks,
  hasSupportedParameterizedCallback,
  isSupportedParameterizedDeclaration,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const messages = {
  duplicate: 'Remove this duplicate test case; it matches the case at index {{index}}.',
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
  const previousRows: { index: number; node: estree.Node }[] = [];
  const duplicateRows: { index: number; node: estree.Node; matchingIndex: number }[] = [];

  dataset.elements.forEach((element, index) => {
    if (element === null || element.type === 'SpreadElement') {
      return;
    }

    const previous = previousRows.find(row => areEquivalent(row.node, element, context.sourceCode));
    if (previous === undefined) {
      previousRows.push({ index, node: element });
      return;
    }

    duplicateRows.push({ index, node: element, matchingIndex: previous.index });
  });

  duplicateRows.forEach((duplicate, duplicatePosition) => {
    const previousDuplicate = duplicateRows[duplicatePosition - 1];
    const isFirstInConsecutiveRun = previousDuplicate?.index !== duplicate.index - 1;
    let lastDuplicate = duplicate;
    if (isFirstInConsecutiveRun) {
      for (let nextPosition = duplicatePosition + 1; ; nextPosition++) {
        const nextDuplicate = duplicateRows[nextPosition];
        if (nextDuplicate?.index !== lastDuplicate.index + 1) {
          break;
        }
        lastDuplicate = nextDuplicate;
      }
    }

    context.report({
      node: duplicate.node,
      messageId: 'duplicate',
      data: { index: duplicate.matchingIndex },
      fix: fixer =>
        removeDuplicateRow(fixer, context.sourceCode, duplicate.node, lastDuplicate.node),
    });
  });
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
  const previousTokenIncludingComments = sourceCode.getTokenBefore(firstElement, {
    includeComments: true,
  });
  const hasCommentBefore = previousTokenIncludingComments !== previousToken;
  const lineStart = sourceCode.getIndexFromLoc({
    line: sourceCode.getLoc(firstElement).start.line,
    column: 0,
  });
  const isOnlyElementOnLine = /^\s*$/.test(sourceCode.text.slice(lineStart, firstElementRange[0]));

  if (hasCommentBefore) {
    const start = isOnlyElementOnLine ? lineStart : firstElementRange[0];
    const nextToken = sourceCode.getTokenAfter(lastElement);
    const end = nextToken?.value === ',' ? nextToken.range[1] : lastElementRange[1];
    const trailingNewline = /^\s*(\r?\n)/.exec(sourceCode.text.slice(end));
    const endWithNewline = trailingNewline ? end + trailingNewline[0].length : end;
    return fixer.removeRange([start, endWithNewline]);
  }

  const start = previousToken?.value === ',' ? previousToken.range[0] : firstElementRange[0];
  return fixer.removeRange([start, lastElementRange[1]]);
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
