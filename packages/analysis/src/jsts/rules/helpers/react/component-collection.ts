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
import type { SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../ancestor.js';
import { getComponentIdentifier } from './component-identity.js';
import { isComponentNode, type ComponentNode } from './component-nodes.js';

export type CollectedComponent = {
  componentNode: ComponentNode;
  componentIdentifier: estree.Identifier | undefined;
};

function collectComponent(componentNode: ComponentNode): CollectedComponent {
  return {
    componentNode,
    componentIdentifier: getComponentIdentifier(componentNode),
  };
}

export function collectComponents(
  root: estree.Node,
  keys: SourceCode.VisitorKeys,
): CollectedComponent[] {
  const result: CollectedComponent[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    if (isComponentNode(node)) {
      result.push(collectComponent(node));
      continue;
    }
    const children = childrenOf(node, keys);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return result;
}

export function collectComponentNodes(
  root: estree.Node,
  keys: SourceCode.VisitorKeys,
): ComponentNode[] {
  return collectComponents(root, keys).map(component => component.componentNode);
}
