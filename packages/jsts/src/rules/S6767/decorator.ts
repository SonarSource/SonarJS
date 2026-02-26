/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S6767/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the no-unused-prop-types rule to suppress false positives when
 * props are used indirectly through patterns the upstream rule cannot track:
 * helper method calls, spread operators, bracket notation, forwardRef, and
 * context providers.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (hasIndirectPropsUsage(context.sourceCode.ast as TSESTree.Program)) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/**
 * Scans the program AST for indirect prop usage patterns that the upstream
 * rule cannot track. Returns true if any such pattern is found.
 *
 * Note: Only patterns that genuinely indicate indirect prop consumption are
 * included. Patterns like super(props), export default HOC(Comp), and
 * exported interfaces are intentionally excluded because they are too broad
 * and cause false negatives for genuinely unused props.
 */
function hasIndirectPropsUsage(program: TSESTree.Program): boolean {
  return hasPattern(program);
}

function hasPattern(node: TSESTree.Node): boolean {
  if (isIndirectPropsPattern(node)) {
    return true;
  }
  for (const child of getChildren(node)) {
    if (hasPattern(child)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a node represents an indirect props usage pattern.
 * Only patterns that genuinely indicate the entire props object is consumed
 * indirectly are included here.
 */
function isIndirectPropsPattern(node: TSESTree.Node): boolean {
  return (
    isPropsPassedToFunction(node) ||
    isPropsSpread(node) ||
    isBracketNotationOnProps(node) ||
    isForwardRefWrapper(node) ||
    isContextProviderWithProps(node)
  );
}

/** Detects: someFunction(props) or someFunction(this.props) */
function isPropsPassedToFunction(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as TSESTree.CallExpression;
  // Exclude super(props) — passing props to the parent constructor does not
  // indicate indirect consumption of the component's own props.
  if (call.callee.type === 'Super') {
    return false;
  }
  return call.arguments.some(isPropsReference);
}

/** Detects: {...props} or {...this.props} */
function isPropsSpread(node: TSESTree.Node): boolean {
  if (node.type !== 'SpreadElement' && node.type !== 'JSXSpreadAttribute') {
    return false;
  }
  const spread = node as TSESTree.SpreadElement | TSESTree.JSXSpreadAttribute;
  return isPropsReference(spread.argument);
}

/** Detects: props[key] or this.props[key] */
function isBracketNotationOnProps(node: TSESTree.Node): boolean {
  if (node.type !== 'MemberExpression') {
    return false;
  }
  const member = node as TSESTree.MemberExpression;
  return member.computed && isPropsReference(member.object);
}

/** Detects: React.forwardRef(...) or forwardRef(...) wrapping a component */
function isForwardRefWrapper(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const call = node as TSESTree.CallExpression;
  const callee = call.callee;
  // Match bare forwardRef(...) call
  if (callee.type === 'Identifier') {
    return (callee as TSESTree.Identifier).name === 'forwardRef';
  }
  // Match React.forwardRef(...) member expression call
  if (callee.type === 'MemberExpression') {
    const member = callee as TSESTree.MemberExpression;
    return (
      member.object.type === 'Identifier' &&
      (member.object as TSESTree.Identifier).name === 'React' &&
      member.property.type === 'Identifier' &&
      (member.property as TSESTree.Identifier).name === 'forwardRef'
    );
  }
  return false;
}

/** Detects: <Context.Provider value={props}> */
function isContextProviderWithProps(node: TSESTree.Node): boolean {
  if (node.type !== 'JSXAttribute') {
    return false;
  }
  const attr = node as TSESTree.JSXAttribute;
  if (attr.name.type !== 'JSXIdentifier' || attr.name.name !== 'value') {
    return false;
  }
  if (!attr.value || attr.value.type !== 'JSXExpressionContainer') {
    return false;
  }
  const expr = attr.value.expression;
  if (expr.type === 'JSXEmptyExpression') {
    return false;
  }
  return isPropsReference(expr as TSESTree.Expression);
}

/** Checks if a node is `props` (Identifier) or `this.props` (MemberExpression) */
function isPropsReference(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return (node as TSESTree.Identifier).name === 'props';
  }
  if (node.type === 'MemberExpression') {
    const member = node as TSESTree.MemberExpression;
    return (
      !member.computed &&
      member.object.type === 'ThisExpression' &&
      member.property.type === 'Identifier' &&
      (member.property as TSESTree.Identifier).name === 'props'
    );
  }
  return false;
}

/** Returns the child nodes of a given node for traversal */
function getChildren(node: TSESTree.Node): TSESTree.Node[] {
  const children: TSESTree.Node[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const value = (node as unknown as Record<string, unknown>)[key];
    if (value && typeof value === 'object') {
      if (isNode(value)) {
        children.push(value as TSESTree.Node);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && isNode(item)) {
            children.push(item as TSESTree.Node);
          }
        }
      }
    }
  }
  return children;
}

function isNode(value: unknown): boolean {
  return typeof (value as TSESTree.Node).type === 'string';
}
