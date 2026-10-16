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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';

/**
 * Gets the opening element for a report on a JSX attribute.
 *
 * @example
 * report(<div tabIndex={0} />.tabIndex) -> <div tabIndex={0} />
 * report(<div tabIndex={0} />)          -> undefined
 */
export function openingElementOf(
  reportDescriptor: Rule.ReportDescriptor,
): TSESTree.JSXOpeningElement | undefined {
  if (!('node' in reportDescriptor) || !reportDescriptor.node) {
    return undefined;
  }
  const node = reportDescriptor.node as TSESTree.Node;
  return node.type === 'JSXAttribute' ? (node.parent as TSESTree.JSXOpeningElement) : undefined;
}

/**
 * Tests the lexical namespace of the opening element.
 * A component can change the namespace when React renders the element.
 *
 * @example For the innermost div
 * <svg><foreignObject><div /></foreignObject></svg> -> true
 * <svg><div /></svg>                               -> false
 */
export function isInHtmlNamespace(opening: TSESTree.JSXOpeningElement): boolean {
  const ancestors: TSESTree.JSXOpeningElement[] = [];
  let ancestor: TSESTree.Node | undefined = opening.parent?.parent;
  while (ancestor) {
    if (ancestor.type === 'JSXElement') {
      ancestors.push(ancestor.openingElement);
    }
    ancestor = ancestor.parent;
  }

  let namespace: 'html' | 'svg' | 'math' = 'html';
  ancestors.reverse();
  for (const element of ancestors) {
    if (element.name.type !== 'JSXIdentifier') {
      continue;
    }
    const name = element.name.name;
    if (namespace === 'html' && (name === 'svg' || name === 'math')) {
      namespace = name;
    } else if (namespace === 'svg' && name === 'foreignObject') {
      namespace = 'html';
    }
  }
  return namespace === 'html';
}
