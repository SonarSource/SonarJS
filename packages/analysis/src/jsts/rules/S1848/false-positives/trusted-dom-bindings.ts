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

import type { Scope } from 'eslint';
import { getVariableFromScope, isIdentifier, isRequireModule } from '../../helpers/ast.js';
import { unwrapTypeAssertion } from './helpers.js';

export function isTrustedJQueryBinding(scope: Scope.Scope, name: string): boolean {
  const variable = getVariableFromScope(scope, name);
  if (!variable?.defs.length) {
    return true;
  }

  return variable.defs.some(def => {
    if (def.type === 'ImportBinding') {
      return def.parent.type === 'ImportDeclaration' && def.parent.source.value === 'jquery';
    }
    if (def.type !== 'Variable') {
      return false;
    }
    if (def.node.init == null) {
      // Ambient/type-only declaration, e.g. `declare const $: JQueryStatic;`
      return true;
    }
    const init = unwrapTypeAssertion(def.node.init);
    return (
      (init.type === 'CallExpression' && isRequireModule(init, 'jquery')) ||
      // `const $ = jQuery;` aliasing the (untouched) jQuery global
      (isIdentifier(init, 'jQuery') && !getVariableFromScope(scope, 'jQuery')?.defs.length)
    );
  });
}

export function isTrustedDocumentBinding(scope: Scope.Scope): boolean {
  const variable = getVariableFromScope(scope, 'document');
  if (!variable?.defs.length) {
    return true;
  }
  const windowNotShadowed = !getVariableFromScope(scope, 'window')?.defs.length;

  return variable.defs.some(def => {
    if (def.type !== 'Variable') {
      return false;
    }
    if (def.node.init == null) {
      // Ambient/type-only declaration, e.g. `declare const document: Document;`
      return true;
    }
    if (!windowNotShadowed) {
      return false;
    }
    const init = unwrapTypeAssertion(def.node.init);
    if (init.type === 'MemberExpression') {
      return isIdentifier(init.object, 'window') && isIdentifier(init.property, 'document');
    }
    if (def.node.id.type === 'ObjectPattern' && isIdentifier(init, 'window')) {
      // `const { document } = window;`
      return def.node.id.properties.some(
        property =>
          property.type === 'Property' &&
          !property.computed &&
          isIdentifier(property.key, 'document'),
      );
    }
    return false;
  });
}
