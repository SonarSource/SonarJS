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
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf, getNodeParent } from '../helpers/ancestor.js';
import { isFunctionNode, isLoopLike, type LoopLike } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (!isSuppressedEarlyExit(context, descriptor)) {
        context.report(descriptor);
      }
    },
  );
}

function isSuppressedEarlyExit(
  context: Rule.RuleContext,
  descriptor: Rule.ReportDescriptor,
): boolean {
  if (!('node' in descriptor)) {
    return false;
  }
  const enclosing = findEnclosingLoop(descriptor.node as estree.Node);
  return (
    !!enclosing?.viaBody &&
    hasLaterLoopExit(enclosing.loop, descriptor.node as estree.Node, context.sourceCode.visitorKeys)
  );
}

/**
 * Mirrors ESLint core's own `isBoundary()` from no-await-in-loop:
 * https://github.com/eslint/eslint/blob/v9.39.5/lib/rules/no-await-in-loop.js#L12-L25
 */
function isBoundary(node: estree.Node): boolean {
  return isFunctionNode(node) || (node.type === 'ForOfStatement' && node.await === true);
}

/**
 * Mirrors ESLint core's own `isLooped()` from no-await-in-loop:
 * https://github.com/eslint/eslint/blob/v9.39.5/lib/rules/no-await-in-loop.js#L33-L56
 */
function isLooped(node: estree.Node, parent: LoopLike): boolean {
  switch (parent.type) {
    case 'ForStatement':
      return node === parent.test || node === parent.update || node === parent.body;
    case 'ForOfStatement':
    case 'ForInStatement':
      return (
        node === parent.body ||
        (node === parent.left &&
          parent.left.type === 'VariableDeclaration' &&
          parent.left.kind === 'await using')
      );
    case 'WhileStatement':
    case 'DoWhileStatement':
      return node === parent.test || node === parent.body;
    default:
      return false;
  }
}

/**
 * Mirrors ESLint core's ancestor-climbing loop from `validate()`, returning the loop and whether
 * the await sits in its body vs. a control clause (test/update/left) instead of reporting - only
 * body awaits get the later-exit suppression below, since a control clause's timing relative to a
 * later body exit isn't uniform (e.g. a `for` loop's `update` runs after the body, not before it):
 * https://github.com/eslint/eslint/blob/v9.39.5/lib/rules/no-await-in-loop.js#L93-L106
 */
function findEnclosingLoop(node: estree.Node): { loop: LoopLike; viaBody: boolean } | null {
  let current = node;
  let parent = getNodeParent(current);
  while (parent) {
    if (isBoundary(parent)) {
      return null;
    }
    if (isLoopLike(parent) && isLooped(current, parent)) {
      return { loop: parent, viaBody: current === parent.body };
    }
    current = parent;
    parent = getNodeParent(current);
  }
  return null;
}

/**
 * Whether the loop body contains a `return`/`break` positioned after `afterNode`,
 * without crossing into a nested function (or nested `for await`) boundary. Matches
 * on any such statement regardless of which branch it's on, or whether a `break`
 * actually targets this specific loop -- a deliberate, measured trade-off (see JS-2409):
 * it also suppresses independent-iteration cases sharing the same shape (e.g.
 * "search a list, return on first match"), accepted as a known false-negative class.
 * An unlabeled `break` inside a nested `switch` is excluded, since it exits the switch
 * rather than the loop; a nested loop resets that exclusion, per the trade-off above.
 */
function hasLaterLoopExit(
  loop: LoopLike,
  afterNode: estree.Node,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  const afterEnd = afterNode.range?.[1] ?? Number.POSITIVE_INFINITY;

  function search(node: estree.Node, inSwitch: boolean): boolean {
    if (isBoundary(node)) {
      return false;
    }
    if (node.range && node.range[0] > afterEnd) {
      if (node.type === 'ReturnStatement') {
        return true;
      }
      if (node.type === 'BreakStatement' && (!inSwitch || node.label)) {
        return true;
      }
    }
    const nestedInSwitch = node.type === 'SwitchStatement' || (inSwitch && !isLoopLike(node));
    return childrenOf(node, visitorKeys).some(child => search(child, nestedInSwitch));
  }

  return search(loop.body, false);
}
