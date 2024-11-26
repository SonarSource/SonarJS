/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import estree from 'estree';
import { isIdentifier, isString, RequiredParserServices } from '../index.js';

export function isRegExpConstructor(node: estree.Node): node is estree.CallExpression {
  return (
    ((node.type === 'CallExpression' || node.type === 'NewExpression') &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'RegExp' &&
      node.arguments.length > 0) ||
    isRegExpWithGlobalThis(node)
  );
}

export function isStringReplaceCall(call: estree.CallExpression, services: RequiredParserServices) {
  return (
    call.callee.type === 'MemberExpression' &&
    call.callee.property.type === 'Identifier' &&
    !call.callee.computed &&
    ['replace', 'replaceAll'].includes(call.callee.property.name) &&
    call.arguments.length > 1 &&
    isString(call.callee.object, services)
  );
}

export function isStringRegexMethodCall(
  call: estree.CallExpression,
  services: RequiredParserServices,
) {
  return (
    call.callee.type === 'MemberExpression' &&
    call.callee.property.type === 'Identifier' &&
    !call.callee.computed &&
    ['match', 'matchAll', 'search'].includes(call.callee.property.name) &&
    call.arguments.length > 0 &&
    isString(call.callee.object, services) &&
    isString(call.arguments[0], services)
  );
}

function isRegExpWithGlobalThis(node: estree.Node) {
  return (
    node.type === 'NewExpression' &&
    node.callee.type === 'MemberExpression' &&
    isIdentifier(node.callee.object, 'globalThis') &&
    isIdentifier(node.callee.property, 'RegExp') &&
    node.arguments.length > 0
  );
}
