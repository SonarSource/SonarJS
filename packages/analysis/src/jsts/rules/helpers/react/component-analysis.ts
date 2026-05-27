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
import ts from 'typescript';
import type { RequiredParserServices } from '../parser-services.js';
import {
  createClassComponentAnalysis,
  getClassComponentPropsTypeCandidates,
} from './class-component-analysis.js';
import type { CollectedComponent } from './component-collection.js';
import { resolveComponent } from './component-resolution.js';
import {
  isClassComponentNode,
  isFunctionComponentNode,
  type ComponentNode,
} from './component-nodes.js';
import {
  createFunctionComponentAnalysis,
  getFunctionComponentPropsTypeCandidates,
} from './function-component-analysis.js';
export { isComponentNode, type ComponentNode } from './component-nodes.js';
export { getComponentIdentifier, getComponentVariable } from './component-identity.js';
export {
  collectComponentNodes,
  collectComponents,
  type CollectedComponent,
} from './component-collection.js';
export { isBuiltinReactSuperclassName } from './class-component-analysis.js';

export type ComponentAnalysis = {
  memberPropsTypeCandidates: ts.Type[];
  enclosingTypePropsTypeCandidates: ts.Type[];
  classNonPropsTypeCandidates: ts.Type[];
};
const EMPTY_COMPONENT_ANALYSIS: ComponentAnalysis = {
  memberPropsTypeCandidates: [],
  enclosingTypePropsTypeCandidates: [],
  classNonPropsTypeCandidates: [],
};

export function getComponentPropsType(
  componentNode: estree.Node,
  services: RequiredParserServices,
): ts.Type | undefined {
  if (isFunctionComponentNode(componentNode)) {
    return getFunctionComponentPropsTypeCandidates(componentNode, services)[0];
  }

  if (isClassComponentNode(componentNode)) {
    return getClassComponentPropsTypeCandidates(componentNode, services)[0];
  }

  return undefined;
}

export function createComponentAnalysis(
  component: ComponentNode | CollectedComponent,
  services: RequiredParserServices,
): ComponentAnalysis {
  const resolvedComponent = resolveComponent(component);
  if (!resolvedComponent) {
    return EMPTY_COMPONENT_ANALYSIS;
  }

  if (resolvedComponent.kind === 'class') {
    return createClassComponentAnalysis(resolvedComponent, services);
  }

  return createFunctionComponentAnalysis(resolvedComponent, services);
}
