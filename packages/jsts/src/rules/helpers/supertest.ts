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
import { getFullyQualifiedName, getImportDeclarations, getRequireCalls } from './index.js';
import estree from 'estree';

export namespace Supertest {
  export function isImported(context: Rule.RuleContext): boolean {
    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === 'supertest',
      ) || getImportDeclarations(context).some(i => i.source.value === 'supertest')
    );
  }

  export function isAssertion(context: Rule.RuleContext, node: estree.Node) {
    const fqn = extractFQNForCallExpression(context, node);

    if (!fqn) {
      return false;
    }

    const names = fqn.split('.');

    /**
     * supertest assertions look like `[supertest instance](...).[HTTP verb](...).expect(...)`, typically:
     * `supertest(application).get('/foo').expect(200)`
     * hence only the first and third values matter, the second one being an HTTP verb irrelevant for assertion detection
     */
    return names.length >= 3 && names[0] === 'supertest' && names[2] === 'expect';
  }

  function extractFQNForCallExpression(context: Rule.RuleContext, node: estree.Node) {
    if (node.type !== 'CallExpression') {
      return undefined;
    }

    return getFullyQualifiedName(context, node);
  }
}
