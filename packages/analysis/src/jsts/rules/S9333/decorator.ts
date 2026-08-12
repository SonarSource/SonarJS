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
// https://sonarsource.github.io/rspec/#/rspec/S9333/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getParent } from '../helpers/ancestor.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { withStrictImportResolution } from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

const RECOGNIZED_MODULE_PREFIX = '@testing-library.';
const APPROVED_MESSAGE =
  'Remove this "await"; "{{name}}" is a synchronous Testing Library query and does not wait for the element.';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const ruleMeta = rule.meta ?? {};
  const decoratedRule: Rule.RuleModule = {
    ...withStrictImportResolution(rule),
    meta: generateMeta(meta, {
      ...ruleMeta,
      messages: {
        ...ruleMeta.messages,
        noAwaitSyncQuery: APPROVED_MESSAGE,
      },
    }),
  };

  return interceptReport(
    decoratedRule,
    (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor): void => {
      if ('node' in descriptor && isKnownNonTestingLibraryQuery(context, descriptor.node)) {
        return;
      }
      context.report(descriptor);
    },
  );
}

function isKnownNonTestingLibraryQuery(
  context: Rule.RuleContext,
  node: estree.Node | null | undefined,
): boolean {
  const call = getQueryCallExpression(context, node);
  if (call?.callee.type !== 'MemberExpression') {
    return false;
  }

  const fqn = getFullyQualifiedName(context, call.callee);
  return fqn != null && !fqn.startsWith(RECOGNIZED_MODULE_PREFIX);
}

function getQueryCallExpression(
  context: Rule.RuleContext,
  node: estree.Node | null | undefined,
): estree.CallExpression | undefined {
  if (node == null) {
    return undefined;
  }

  const parent = getParent(context, node);
  if (parent?.type === 'CallExpression' && parent.callee === node) {
    return parent;
  }

  if (parent?.type === 'MemberExpression' && parent.property === node) {
    const call = getParent(context, parent);
    if (call?.type === 'CallExpression' && call.callee === parent) {
      return call;
    }
  }

  return undefined;
}
