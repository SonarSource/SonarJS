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
import type { TSESTree } from '@typescript-eslint/utils';

export const REACT_THREE_FIBER = '@react-three/fiber';

const R3F_INTRINSIC_ELEMENTS = new Set([
  'ambientLight',
  'pointLight',
  'spotLight',
  'directionalLight',
  'mesh',
  'group',
  'scene',
  'perspectiveCamera',
  'orthographicCamera',
  'circleGeometry',
  'sphereGeometry',
  'boxGeometry',
  'planeGeometry',
  'torusKnotGeometry',
  'shaderMaterial',
  'meshBasicMaterial',
  'meshStandardMaterial',
  'meshPhongMaterial',
]);

const R3F_INTRINSIC_PROPS = new Set([
  'args',
  'attach',
  'color',
  'distance',
  'fragmentShader',
  'intensity',
  'position',
  'rotation',
  'scale',
  'transparent',
  'uniforms',
  'vertexShader',
  'wireframe',
]);

export function isReactThreeFiberIntrinsicProp(descriptor: Rule.ReportDescriptor): boolean {
  if (!('node' in descriptor)) {
    return false;
  }

  const node = descriptor.node as TSESTree.Node;
  if (node.type !== 'JSXAttribute') {
    return false;
  }

  const openingElement = node.parent;
  if (openingElement?.type !== 'JSXOpeningElement') {
    return false;
  }

  const elementName = openingElement.name;
  return (
    elementName.type === 'JSXIdentifier' &&
    R3F_INTRINSIC_ELEMENTS.has(elementName.name) &&
    isReactThreeFiberIntrinsicPropName(node.name)
  );
}

function isReactThreeFiberIntrinsicPropName(name: TSESTree.JSXAttribute['name']): boolean {
  if (name.type !== 'JSXIdentifier') {
    return false;
  }

  return R3F_INTRINSIC_PROPS.has(name.name) || /^(position|rotation|scale)-[xyz]$/.test(name.name);
}
