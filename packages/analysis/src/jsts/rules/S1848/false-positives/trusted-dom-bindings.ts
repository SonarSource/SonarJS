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

/**
 * Returns whether a `Variable`-def's declaration is an ambient, type-only
 * declaration (`declare const $: JQueryStatic;`). A plain uninitialized binding
 * (`let $;`) or a for-of/for-in binding also has a null `init`, so the TypeScript
 * `declare` flag - not a null init - is what actually distinguishes the two.
 */
function isAmbientDeclaration(def: Scope.Definition & { type: 'Variable' }): boolean {
  return (def.parent as { declare?: boolean } | null)?.declare === true;
}

export function isTrustedJQueryBinding(
  scope: Scope.Scope,
  name: string,
  seen: Set<string> = new Set(),
): boolean {
  if (seen.has(name)) {
    return false;
  }
  seen.add(name);

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
      return isAmbientDeclaration(def);
    }
    const init = unwrapTypeAssertion(def.node.init);
    return (
      (init.type === 'CallExpression' && isRequireModule(init, 'jquery')) ||
      // `const $ = jQuery;` aliasing an already-trusted jQuery binding
      (isIdentifier(init, 'jQuery') && isTrustedJQueryBinding(scope, 'jQuery', seen))
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
      return isAmbientDeclaration(def);
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
