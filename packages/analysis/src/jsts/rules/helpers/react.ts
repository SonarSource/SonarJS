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
import { isComponentNode } from './react/component-analysis.js';
import { findComponentOwnersByType } from './react/type-ownership.js';

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
 * The returned nodes are only the owner set for the report. Rule-specific
 * suppression or false-positive handling can be applied afterwards by callers.
 *
 * @param node the reported node located inside a React-related construct
 * @param context the current ESLint rule context
 * @returns every component node that owns `node`
 */
export function findComponentNodes(node: estree.Node, context: Rule.RuleContext): estree.Node[] {
  const ancestors = context.sourceCode.getAncestors(node);

  // Strategy A: direct component ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (isComponentNode(ancestors[i])) {
      return [ancestors[i]];
    }
  }

  // Strategy B: Foo.propTypes = {...} assignment ancestor
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const anc = ancestors[i];
    if (!isReactPropTypesAssignment(anc)) {
      continue;
    }
    const defNode = findPropTypesAssignmentOwner(node, context.sourceCode, anc);
    if (defNode) {
      return [defNode];
    }
  }

  // Strategy C: TypeScript type checker
  return findComponentOwnersByType(ancestors, context, context.sourceCode.visitorKeys);
}
