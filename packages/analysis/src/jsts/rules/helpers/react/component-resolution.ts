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
import type { CollectedComponent } from './component-collection.js';
import { getComponentIdentifier, isAnonymousDefaultExportComponent } from './component-identity.js';
import {
  isClassComponentNode,
  isFunctionComponentNode,
  type ClassComponentNode,
  type ComponentNode,
  type FunctionComponentNode,
} from './component-nodes.js';

export type ClassComponentDescriptor = {
  kind: 'class';
  node: ClassComponentNode;
};

export type FunctionComponentDescriptor = {
  kind: 'function';
  node: FunctionComponentNode;
};

type ComponentDescriptor = ClassComponentDescriptor | FunctionComponentDescriptor;

function isCollectedComponent(
  component: ComponentNode | CollectedComponent,
): component is CollectedComponent {
  return 'componentNode' in component;
}

function getCollectedComponent(component: ComponentNode | CollectedComponent): CollectedComponent {
  return isCollectedComponent(component)
    ? component
    : {
        componentNode: component,
        componentIdentifier: getComponentIdentifier(component),
      };
}

export function resolveComponent(
  component: ComponentNode | CollectedComponent,
): ComponentDescriptor | undefined {
  const { componentNode, componentIdentifier } = getCollectedComponent(component);

  if (isClassComponentNode(componentNode)) {
    return hasRenderMethodOrProperty(componentNode)
      ? {
          kind: 'class',
          node: componentNode,
        }
      : undefined;
  }

  if (isFunctionComponentNode(componentNode)) {
    return isEligibleFunctionComponent(componentNode, componentIdentifier)
      ? {
          kind: 'function',
          node: componentNode,
        }
      : undefined;
  }

  return undefined;
}

/**
 * Returns whether a function component should participate in component analysis.
 * Named components must follow React's uppercase convention, while anonymous
 * function components stay eligible only when they are exported as default.
 */
function isEligibleFunctionComponent(
  componentNode: FunctionComponentNode,
  componentIdentifier: estree.Identifier | undefined,
): boolean {
  return componentIdentifier === undefined
    ? isAnonymousDefaultExportComponent(componentNode)
    : /^[A-Z]/.test(componentIdentifier.name);
}

function hasRenderMethodOrProperty(componentNode: ClassComponentNode): boolean {
  return componentNode.body.body.some(
    member =>
      (member.type === 'MethodDefinition' || member.type === 'PropertyDefinition') &&
      member.key.type === 'Identifier' &&
      member.key.name === 'render',
  );
}
