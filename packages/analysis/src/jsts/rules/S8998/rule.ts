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
// https://sonarsource.github.io/rspec/#/rspec/S8998/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { getVariableFromScope, unwrapTypeScriptExpression } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getParameterizedTestFrameworks,
  hasSupportedParameterizedCallback,
  isSupportedParameterizedDeclaration,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const messages = {
  emptyDataset: 'This parameterized test has no cases, so its body never runs.',
} as const;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
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

        if (isEmptyArray(dataset) || isKnownEmptyDataset(context, dataset)) {
          context.report({ messageId: 'emptyDataset', node: dataset });
        }
      },
    };
  },
};

function getDataset(node: estree.CallExpression): estree.Expression | undefined {
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
  return dataset?.type === 'SpreadElement' ? undefined : dataset;
}

function isEmptyArray(node: estree.Node | null): boolean {
  if (node === null) {
    return false;
  }

  const unwrapped = unwrapTypeScriptExpression(node);
  return unwrapped.type === 'ArrayExpression' && unwrapped.elements.length === 0;
}

function isKnownEmptyDataset(context: Rule.RuleContext, dataset: estree.Expression): boolean {
  if (dataset.type !== 'Identifier') {
    return false;
  }

  const scope = context.sourceCode.getScope(dataset);
  const variable = getVariableFromScope(scope, dataset.name);
  if (variable?.scope.variableScope !== scope.variableScope) {
    return false;
  }

  const datasetStart = dataset.range?.[0];
  if (datasetStart === undefined) {
    return false;
  }

  const writes = variable.references.filter(reference => {
    const writeStart = reference.identifier.range?.[0];
    return (
      reference.isWrite() &&
      (writeStart === undefined ||
        writeStart < datasetStart ||
        reference.from.variableScope !== variable.scope.variableScope)
    );
  });
  if (writes.length !== 1 || !isEmptyArray(writes[0].writeExpr)) {
    return false;
  }

  return hasNoInterveningReference(variable, writes[0], dataset);
}

function hasNoInterveningReference(
  variable: Scope.Variable,
  write: Scope.Reference,
  dataset: estree.Identifier,
): boolean {
  const writeStart = write.identifier.range?.[0];
  const datasetStart = dataset.range?.[0];
  if (writeStart === undefined || datasetStart === undefined || writeStart >= datasetStart) {
    return false;
  }

  return !variable.references.some(reference => {
    const start = reference.identifier.range?.[0];
    return (
      reference !== write &&
      reference.identifier !== dataset &&
      (reference.from.variableScope !== variable.scope.variableScope ||
        (start !== undefined && writeStart < start && start < datasetStart))
    );
  });
}
