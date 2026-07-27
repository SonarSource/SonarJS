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
// https://sonarsource.github.io/rspec/#/rspec/S9026/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { withStrictImportResolution } from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

const AWAIT_ASYNC_QUERY_MESSAGE_ID = 'awaitAsyncQuery';

function isInsideAsyncFunction(node: TSESTree.Node): boolean {
  const functionNode = findFirstMatchingAncestor(node, ancestor => {
    return (
      ancestor.type === 'FunctionDeclaration' ||
      ancestor.type === 'FunctionExpression' ||
      ancestor.type === 'ArrowFunctionExpression'
    );
  });
  return (
    (functionNode?.type === 'FunctionDeclaration' ||
      functionNode?.type === 'FunctionExpression' ||
      functionNode?.type === 'ArrowFunctionExpression') &&
    functionNode.async
  );
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const ruleMeta = rule.meta ?? {};
  const decoratedRule = {
    ...withStrictImportResolution(rule),
    meta: generateMeta(meta, {
      ...ruleMeta,
      messages: {
        ...ruleMeta.messages,
        awaitAsyncQuery:
          'The promise returned by {{ name }} is unhandled, so the test can continue before the queried element is available.',
        asyncQueryWrapper:
          'The promise returned by async-query wrapper {{ name }} is unhandled, so callers can proceed before its result is ready.',
      },
    }),
  };

  return interceptReport(decoratedRule, (context, descriptor) => {
    if (
      'messageId' in descriptor &&
      descriptor.messageId === AWAIT_ASYNC_QUERY_MESSAGE_ID &&
      'node' in descriptor &&
      !isInsideAsyncFunction(descriptor.node as TSESTree.Node)
    ) {
      const { fix: _fix, ...reportDescriptor } = descriptor;
      context.report(reportDescriptor);
      return;
    }
    context.report(descriptor);
  });
}
