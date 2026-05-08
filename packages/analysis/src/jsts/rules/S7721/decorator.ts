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
// https://sonarsource.github.io/rspec/#/rspec/S7721/javascript

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { isFunctionNode } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    reportExemptingAncestorLocalCaptures,
  );
}

function reportExemptingAncestorLocalCaptures(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
) {
  if (!('node' in reportDescriptor) || !isFunctionNode(reportDescriptor.node)) {
    context.report(reportDescriptor);
    return;
  }

  if (!capturesAncestorLocalScope(reportDescriptor.node, context.sourceCode)) {
    context.report(reportDescriptor);
  }
}

function capturesAncestorLocalScope(node: estree.Function, sourceCode: SourceCode): boolean {
  const functionScope = sourceCode.scopeManager.acquire(node);
  if (!functionScope) {
    return false;
  }

  const ancestorScopes = getAncestorLocalScopes(functionScope);
  return ancestorScopes.size > 0 && scopeCapturesAncestorLocalScope(functionScope, ancestorScopes);
}

function getAncestorLocalScopes(scope: Scope.Scope): Set<Scope.Scope> {
  const ancestorScopes = new Set<Scope.Scope>();
  let currentScope = scope.upper;

  while (currentScope) {
    if (currentScope.type !== 'global' && currentScope.type !== 'module') {
      ancestorScopes.add(currentScope);
    }

    currentScope = currentScope.upper;
  }

  return ancestorScopes;
}

function scopeCapturesAncestorLocalScope(
  scope: Scope.Scope,
  ancestorScopes: Set<Scope.Scope>,
): boolean {
  return (
    scope.references.some(reference =>
      referenceCapturesAncestorLocalVariable(reference, ancestorScopes),
    ) ||
    scope.childScopes.some(childScope =>
      scopeCapturesAncestorLocalScope(childScope, ancestorScopes),
    )
  );
}

function referenceCapturesAncestorLocalVariable(
  reference: Scope.Reference,
  ancestorScopes: Set<Scope.Scope>,
): boolean {
  const variable = reference.resolved;
  return (
    (reference.isRead() || reference.isWrite()) &&
    variable !== null &&
    ancestorScopes.has(variable.scope) &&
    variable.defs.some(
      definition => definition.type === 'Variable' || definition.type === 'Parameter',
    )
  );
}
