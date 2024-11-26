/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import type { Rule } from 'eslint';
import estree from 'estree';
import { getFullyQualifiedName, getImportDeclarations, getRequireCalls } from './index.js';

export namespace Vitest {
  export function isImported(context: Rule.RuleContext): boolean {
    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === 'vitest',
      ) || getImportDeclarations(context).some(i => i.source.value === 'vitest')
    );
  }

  export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
    return isExpectUsage(context, node);
  }

  function isExpectUsage(context: Rule.RuleContext, node: estree.Node) {
    // expect(), vitest.expect()
    return extractFQNforCallExpression(context, node) === 'vitest.expect';
  }

  function extractFQNforCallExpression(context: Rule.RuleContext, node: estree.Node) {
    if (node.type !== 'CallExpression') {
      return undefined;
    }
    return getFullyQualifiedName(context, node);
  }
}
