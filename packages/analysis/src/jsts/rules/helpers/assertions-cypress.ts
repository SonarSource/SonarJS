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
import type estree from 'estree';
import { isIdentifier, isMethodCall } from './ast.js';
import type { Assertion } from './assertions.js';
import {
  getArgumentAtIndex,
  getChaiPropertyPredicate,
  type ChaiPredicate,
} from './assertions-chai-common.js';

type CypressComparison = 'strict' | 'deep';

/**
 * Covers Cypress chain assertions like `cy.wrap(value).should('be.true')` or `cy.wrap(value).and('be.null')`.
 * The predicate is a Chai assertion string (dot-separated, optional `not.` prefix).
 */
export function extractCypressChainAssertion(node: estree.Node): Assertion | null {
  if (node.type !== 'CallExpression' || !isMethodCall(node)) {
    return null;
  }
  if (!isIdentifier(node.callee.property, 'should', 'and')) {
    return null;
  }

  const predicateArg = node.arguments[0];
  if (predicateArg?.type !== 'Literal' || typeof predicateArg.value !== 'string') {
    return null;
  }

  const subject = extractCyWrapSubject(node.callee.object);
  if (!subject) {
    return null;
  }

  const comparison = parseCypressComparisonString(predicateArg.value);
  if (comparison) {
    const expected = getArgumentAtIndex(node, 1);
    if (!expected) {
      return null;
    }
    return {
      style: 'cypress',
      kind: 'comparison',
      comparison,
      actual: subject,
      expected,
      negated: predicateArg.value.split('.').includes('not'),
      node,
      reportNode: node.callee.property,
    };
  }

  const parsed = parseCypressPredicateString(predicateArg.value);
  if (!parsed) {
    return null;
  }

  return {
    style: 'cypress',
    kind: 'predicate',
    predicate: parsed.predicate,
    actual: subject,
    negated: parsed.negated,
    node,
    reportNode: subject,
  };
}

function parseCypressComparisonString(predicate: string): CypressComparison | null {
  const parts = predicate.split('.');
  let idx = 0;
  if (parts[idx] === 'not') {
    idx++;
  }
  if (parts[idx] === 'deep' && parts[idx + 1] === 'equal') {
    return 'deep';
  }
  if (parts[idx] === 'equal') {
    return 'strict';
  }
  return null;
}

function extractCyWrapSubject(node: estree.Node): estree.Node | null {
  if (node.type === 'CallExpression' && isMethodCall(node)) {
    if (isIdentifier(node.callee.object, 'cy') && isIdentifier(node.callee.property, 'wrap')) {
      const arg = node.arguments[0];
      return arg && arg.type !== 'SpreadElement' ? arg : null;
    }
    return extractCyWrapSubject(node.callee.object);
  }
  if (node.type === 'MemberExpression' && !node.computed) {
    return extractCyWrapSubject(node.object);
  }
  return null;
}

function parseCypressPredicateString(
  predicate: string,
): { predicate: ChaiPredicate; negated: boolean } | null {
  const parts = predicate.split('.');
  let idx = 0;

  const negated = parts[idx] === 'not';
  if (negated) {
    idx++;
  }

  if (parts[idx] === 'be') {
    idx++;
  }

  const result = getChaiPropertyPredicate(parts[idx]);
  return result ? { predicate: result.predicate, negated } : null;
}
