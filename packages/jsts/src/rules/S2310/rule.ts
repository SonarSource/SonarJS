/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S2310/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getParent,
  getVariableFromName,
  report,
  resolveIdentifiers,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),

  create(context: Rule.RuleContext) {
    function checkLoop<T>(
      updateNode: T,
      extractCounters: (updateNode: T, counters: estree.Identifier[]) => void,
      loopBody: estree.Node,
    ) {
      const counters: estree.Identifier[] = [];
      extractCounters(updateNode, counters);
      counters.forEach(counter => checkCounter(counter, loopBody as estree.BlockStatement));
    }

    function checkCounter(counter: estree.Identifier, block: estree.Node) {
      const variable = getVariableFromName(context, counter.name, block);
      if (!variable) {
        return;
      }
      variable.references.forEach(ref => {
        if (ref.isWrite() && isUsedInsideBody(ref.identifier, block)) {
          report(
            context,
            {
              node: ref.identifier,
              message: `Remove this assignment of "${counter.name}".`,
            },

            [toSecondaryLocation(counter, 'Counter variable update')],
          );
        }
      });
    }

    return {
      'ForStatement > BlockStatement': (node: estree.Node) => {
        const forLoop = getParent(context, node) as estree.ForStatement;
        if (forLoop.update) {
          checkLoop(forLoop.update, collectCountersFor, node);
        }
      },
      'ForInStatement > BlockStatement, ForOfStatement > BlockStatement': (node: estree.Node) => {
        const { left } = getParent(context, node) as estree.ForOfStatement | estree.ForInStatement;
        checkLoop(left, collectCountersForX, node);
      },
    };
  },
};

function collectCountersForX(
  updateExpression: estree.Pattern | estree.VariableDeclaration,
  counters: estree.Identifier[],
) {
  if (updateExpression.type === 'VariableDeclaration') {
    updateExpression.declarations.forEach(decl => collectCountersForX(decl.id, counters));
  } else {
    resolveIdentifiers(updateExpression as TSESTree.Node, true).forEach(id => counters.push(id));
  }
}

function collectCountersFor(updateExpression: estree.Expression, counters: estree.Identifier[]) {
  let counter: estree.Node | null | undefined = undefined;

  if (updateExpression.type === 'AssignmentExpression') {
    counter = updateExpression.left;
  } else if (updateExpression.type === 'UpdateExpression') {
    counter = updateExpression.argument;
  } else if (updateExpression.type === 'SequenceExpression') {
    updateExpression.expressions.forEach(e => collectCountersFor(e, counters));
  }

  if (counter && counter.type === 'Identifier') {
    counters.push(counter);
  }
}

function isUsedInsideBody(id: estree.Identifier, loopBody: estree.Node) {
  const bodyRange = loopBody.range;
  return id.range && bodyRange && id.range[0] > bodyRange[0] && id.range[1] < bodyRange[1];
}
