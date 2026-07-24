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

const R3F_COMMON_PROPS = new Set(['args', 'attach']);

const R3F_OBJECT_3D_ELEMENTS = new Set([
  'ambientLight',
  'pointLight',
  'spotLight',
  'directionalLight',
  'mesh',
  'group',
  'scene',
  'perspectiveCamera',
  'orthographicCamera',
]);

const R3F_ELEMENT_PROPS = new Map([
  ['ambientLight', new Set(['color', 'intensity'])],
  ['pointLight', new Set(['color', 'distance', 'intensity'])],
  ['spotLight', new Set(['color', 'distance', 'intensity'])],
  ['directionalLight', new Set(['color', 'intensity'])],
  [
    'shaderMaterial',
    new Set(['fragmentShader', 'transparent', 'uniforms', 'vertexShader', 'wireframe']),
  ],
  ['meshBasicMaterial', new Set(['color', 'transparent', 'wireframe'])],
  ['meshStandardMaterial', new Set(['color', 'transparent', 'wireframe'])],
  ['meshPhongMaterial', new Set(['color', 'transparent', 'wireframe'])],
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
    isReactThreeFiberIntrinsicPropName(elementName.name, node.name)
  );
}

function isReactThreeFiberIntrinsicPropName(
  elementName: string,
  name: TSESTree.JSXAttribute['name'],
): boolean {
  if (name.type !== 'JSXIdentifier') {
    return false;
  }

  return (
    R3F_COMMON_PROPS.has(name.name) ||
    isObject3DTransformProp(elementName, name.name) ||
    R3F_ELEMENT_PROPS.get(elementName)?.has(name.name) === true
  );
}

function isObject3DTransformProp(elementName: string, propName: string): boolean {
  return (
    R3F_OBJECT_3D_ELEMENTS.has(elementName) && /^(position|rotation|scale)(-[xyz])?$/.test(propName)
  );
}
