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
    return (
      def.type === 'Variable' &&
      def.node.init?.type === 'CallExpression' &&
      isRequireModule(def.node.init, 'jquery')
    );
  });
}

export function isTrustedDocumentBinding(scope: Scope.Scope): boolean {
  const variable = getVariableFromScope(scope, 'document');
  if (!variable?.defs.length) {
    return true;
  }

  return variable.defs.some(def => {
    const init = def.type === 'Variable' ? unwrapTypeAssertion(def.node.init ?? def.node) : undefined;
    return (
      init?.type === 'MemberExpression' &&
      isIdentifier(init.object, 'window') &&
      isIdentifier(init.property, 'document') &&
      !getVariableFromScope(scope, 'window')?.defs.length
    );
  });
}
