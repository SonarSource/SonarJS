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
import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import { getParent } from '../helpers/ancestor.js';

/**
 * A bare `<expr>.should` access asserts nothing on its own — only a `.should`
 * that is *extended* by further property access or a call (e.g. `.should.be.true`,
 * `.should.have.property(...)`) is a real chai assertion.
 *
 * The shared JS detector (`Chai.isShouldUsage`) matches *any* `.should` member, so
 * S2699 subtracts the standalone case here.
 */
export function isStandaloneShouldAccess(context: Rule.RuleContext, node: estree.Node): boolean {
  if (!isShouldMember(node)) {
    return false;
  }
  const parent = getParent(context, node);
  return !isExtendingShouldChainParent(parent, node);
}

/**
 * Type-aware counterpart. Unlike the JS side, the shared TS detector
 * (`Chai.isTSAssertion`) only recognises `.should` chains that end in a call whose
 * fully-qualified name resolves through chai's type augmentation — so it misses
 * property-terminal chains (`.should.be.true`) and chains rooted in locals whose
 * name does not resolve (`user.should.equal(...)`). Mirroring the JS contract, any
 * `.should` property access that is *extended* by a further access or call is an
 * assertion regardless of the terminal shape, so S2699 adds that case here.
 */
export function isExtendedTSShouldAccess(node: ts.Node): boolean {
  if (!isTSShouldAccess(node)) {
    return false;
  }
  return isTSExtendingShouldChainParent(node.parent, node);
}

function isShouldMember(node: estree.Node): node is estree.MemberExpression {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'should'
  );
}

function isTSShouldAccess(node: ts.Node): node is ts.PropertyAccessExpression {
  return ts.isPropertyAccessExpression(node) && node.name.text === 'should';
}

function isExtendingShouldChainParent(
  parent: estree.Node | undefined,
  node: estree.MemberExpression,
): boolean {
  return (
    (parent?.type === 'MemberExpression' && parent.object === node) ||
    (parent?.type === 'CallExpression' && parent.callee === node)
  );
}

function isTSExtendingShouldChainParent(parent: ts.Node | undefined, node: ts.Node): boolean {
  if (parent === undefined) {
    return false;
  }
  return (
    (ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
    (ts.isCallExpression(parent) && parent.expression === node)
  );
}
