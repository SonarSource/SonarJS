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
import type * as owned from '../../../../src/jsts/frontend/parser.js';
import type * as reference from '@typescript-eslint/parser';

export function scopeShape(
  result: ReturnType<typeof owned.parseForESLint> | ReturnType<typeof reference.parseForESLint>,
) {
  return result.scopeManager.scopes.map(scope => ({
    type: scope.type,
    block: scope.block.range,
    strict: scope.isStrict,
    variables: scope.variables.map(variable => ({
      name: variable.name,
      identifiers: variable.identifiers.map(node => node.range),
      definitions: variable.defs.map(def => ({
        type: def.type,
        name: def.name.range,
        node: def.node.range,
      })),
      references: variable.references.map(ref => ref.identifier.range),
    })),
    references: scope.references.map(ref => ({
      identifier: ref.identifier.range,
      resolved: ref.resolved?.name,
      read: ref.isRead(),
      write: ref.isWrite(),
      type: ref.isTypeReference,
      value: ref.isValueReference,
    })),
    through: scope.through.map(ref => ref.identifier.range),
  }));
}
