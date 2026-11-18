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
import type { Rule } from 'eslint';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import {
  getReturnedExpression,
  getVariableFromName,
  isIdentifier,
  resolveLocalHelper,
  resolveSingleWriteExpression,
} from '../ast.js';
import ts from 'typescript';

const ASSERTION_METHODS = ['should', 'and'];

/**
 * Detects Cypress assertion calls on the global `cy` chain, e.g.:
 *   cy.get('selector').should('be.visible')
 *   cy.contains('text').and('have.attr', 'href')
 *   cy.intercept(...).as(...); cy.wait('@alias').its('foo').should(...)
 */
export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  if (node.callee.type !== 'MemberExpression' || node.callee.computed) {
    return false;
  }
  if (!isIdentifier(node.callee.property, ...ASSERTION_METHODS)) {
    return false;
  }
  return (
    chainStartsWithCy(node.callee.object) || resolvesToCy(context, node.callee.object, new Set())
  );
}

export function isTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  context: Rule.RuleContext,
): boolean {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const call = node as ts.CallExpression;
  if (call.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }
  const member = call.expression as ts.PropertyAccessExpression;
  if (!ASSERTION_METHODS.includes(member.name.text)) {
    return false;
  }
  if (tsChainStartsWithCy(member.expression)) {
    return true;
  }
  const mapped = services.tsNodeToESTreeNodeMap.get(node);
  return mapped !== undefined && isAssertion(context, mapped as estree.Node);
}

export function chainStartsWithCy(node: estree.Node): boolean {
  if (isIdentifier(node, 'cy')) {
    return true;
  }
  if (node.type === 'MemberExpression') {
    return chainStartsWithCy(node.object);
  }
  if (node.type === 'CallExpression') {
    return chainStartsWithCy(node.callee);
  }
  if (node.type === 'ChainExpression') {
    return chainStartsWithCy(node.expression);
  }
  return false;
}

function tsChainStartsWithCy(node: ts.Node): boolean {
  if (node.kind === ts.SyntaxKind.Identifier) {
    return (node as ts.Identifier).text === 'cy';
  }
  if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
    return tsChainStartsWithCy((node as ts.PropertyAccessExpression).expression);
  }
  if (node.kind === ts.SyntaxKind.CallExpression) {
    return tsChainStartsWithCy((node as ts.CallExpression).expression);
  }
  if (node.kind === ts.SyntaxKind.NonNullExpression) {
    return tsChainStartsWithCy((node as ts.NonNullExpression).expression);
  }
  return false;
}

/** Follow stable local aliases and simple factory returns without treating selection as assertion. */
function resolvesToCy(
  context: Rule.RuleContext,
  node: estree.Node,
  visiting: Set<estree.Node>,
): boolean {
  node = resolveSingleWriteExpression(context, node);
  if (visiting.has(node)) {
    return false;
  }
  visiting.add(node);
  if (isIdentifier(node, 'cy')) {
    return !getVariableFromName(context, node.name, node)?.defs.length;
  }
  if (node.type === 'MemberExpression') {
    return resolvesToCy(context, node.object, visiting);
  }
  if (node.type === 'ChainExpression') {
    return resolvesToCy(context, node.expression, visiting);
  }
  if (node.type !== 'CallExpression') {
    return false;
  }
  if (node.callee.type === 'MemberExpression') {
    return resolvesToCy(context, node.callee.object, visiting);
  }
  if (node.callee.type !== 'Identifier') {
    return false;
  }
  const helper = resolveLocalHelper(context, node.callee);
  if (!helper || helper.async || helper.generator) {
    return false;
  }
  const returned = getReturnedExpression(helper);
  return returned !== undefined && resolvesToCy(context, returned, visiting);
}
