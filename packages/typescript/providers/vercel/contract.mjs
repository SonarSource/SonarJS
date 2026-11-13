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
import { CompilerContractError } from '../../errors.cjs';

export function compilerCall(operation, invoke) {
  try {
    return invoke();
  } catch (cause) {
    if (cause instanceof CompilerContractError) throw cause;
    const error = new CompilerContractError(`Vercel TS7 ${operation}: ${cause.message ?? cause}`);
    error.cause = cause;
    throw error;
  }
}

export function compilerMethods(object, label) {
  for (const [name, method] of Object.entries(object)) {
    if (typeof method === 'function')
      object[name] = function (...args) {
        return compilerCall(`${label}.${name}`, () => method.apply(this, args));
      };
  }
  return object;
}
