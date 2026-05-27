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
import { getVariableFromScope, isIdentifier } from './ast.js';
import { getFullyQualifiedName } from './module.js';
import { isBuiltinReactSuperclassName, isComponentNode } from './react/component-analysis.js';
import { findComponentOwnersByType } from './react/type-ownership.js';

export { getComponentPropsType, getComponentVariable } from './react/component-analysis.js';
export { hasOnlyReactClassNonPropsReportedTypeUsage } from './react/type-ownership.js';

const REACT_QUALIFIED_CLASS_SUPERS = new Set(['react.Component', 'react.PureComponent']);

function isReactPropTypesAssignment(node: estree.Node): node is estree.AssignmentExpression & {
  left: estree.MemberExpression & { object: estree.Identifier };
} {
  return (
    node.type === 'AssignmentExpression' &&
    node.left.type === 'MemberExpression' &&
    isIdentifier(node.left.property, 'propTypes') &&
    node.left.object.type === 'Identifier'
  );
}

function findPropTypesAssignmentOwner(
  reportedNode: estree.Node,
  sourceCode: Rule.RuleContext['sourceCode'],
  propTypesAssignment: estree.AssignmentExpression & {
    left: estree.MemberExpression & { object: estree.Identifier };
  },
): estree.Node | undefined {
  return getVariableFromScope(
    sourceCode.getScope(reportedNode),
    propTypesAssignment.left.object.name,
  )?.defs[0]?.node as estree.Node | undefined;
}

/**
 * Returns the React components that own a reported node.
 *
 * Example:
 * ```tsx
 * interface SharedProps {
 *   sharedValue: string;
 * }
 *
 * interface ChildProps extends SharedProps {
 *   title: string;
 * }
 *
 * const Child: React.FC<ChildProps> = props => <div>{props.title}</div>;
 * const Wrapper: React.FC<SharedProps> = props => <Child {...props} title="x" />;
 * ```
 *
 * A report raised on `sharedValue` inside `SharedProps` belongs to both `Child` and `Wrapper`.
 * This helper returns both component nodes.
 *
 * It resolves owners in three stages:
 * - a direct enclosing component
 * - a `Foo.propTypes = { ... }` assignment owner
 * - a TypeScript fallback for reported props types
 *
 * The returned nodes are the components that still own the report from a props
 * validation perspective. For the TypeScript fallback, that means components
 * classified as `props` or `mixed`; pure `non-props` owners such as state-only
 * or snapshot-only class usages are intentionally filtered out.
 *
 * Rule-specific suppression or false-positive handling can be applied
 * afterwards by callers.
 *
 * @param node the reported node located inside a React-related construct
 * @param context the current ESLint rule context
 * @returns every component node that owns `node`
 */
export function findComponentNodes(node: estree.Node, context: Rule.RuleContext): estree.Node[] {
  const ancestors = context.sourceCode.getAncestors(node);

  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (isComponentNode(ancestors[i])) {
      return [ancestors[i]];
    }
  }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (!isReactPropTypesAssignment(ancestor)) {
      continue;
    }

    const owner = findPropTypesAssignmentOwner(node, context.sourceCode, ancestor);
    if (owner) {
      return [owner];
    }
  }

  return findComponentOwnersByType(ancestors, context);
}

/**
 * Returns true when an ESTree superclass expression resolves to one of React's
 * built-in component base classes.
 *
 * This recognizes imported aliases such as:
 * - `import { Component as BaseComponent } from 'react';`
 * - `import * as UI from 'react';`
 *
 * and preserves the existing syntax-based fallback for bare `Component` /
 * `PureComponent` and `React.Component` / `React.PureComponent`.
 */
export function isReactComponentSuperclass(
  context: Rule.RuleContext,
  superClass: estree.Expression,
): boolean {
  return (
    REACT_QUALIFIED_CLASS_SUPERS.has(getFullyQualifiedName(context, superClass) ?? '') ||
    isBuiltinReactSuperclass(superClass)
  );
}

function isBuiltinReactSuperclass(superClass: estree.Expression): boolean {
  return (
    (superClass.type === 'Identifier' &&
      isBuiltinReactSuperclassName(undefined, superClass.name)) ||
    (superClass.type === 'MemberExpression' &&
      isIdentifier(superClass.object, 'React') &&
      superClass.property.type === 'Identifier' &&
      isBuiltinReactSuperclassName('React', superClass.property.name))
  );
}
