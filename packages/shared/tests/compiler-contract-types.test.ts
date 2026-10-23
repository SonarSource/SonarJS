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
import type ts from 'typescript';
import type { Provider } from 'typescript/contract';
import { it } from 'node:test';

// Compile-time regression checks: unsupported SDK operations must not leak back in.
function checkContract(
  program: ts.Program,
  checker: ts.TypeChecker,
  provider: Provider,
  factory: typeof ts.factory,
) {
  // @ts-expect-error Emission is outside the analyzer contract.
  program.emit();
  // @ts-expect-error This SDK operation is outside the supported checker subset.
  checker.getConstantValue(null as never);
  // @ts-expect-error The analyzer only requires identifier construction.
  factory.createStringLiteral('value');
  // @ts-expect-error Resource cleanup is required for every provider.
  const incomplete: Provider = { compiler: provider.compiler, compilerVersion: 'test' };
  // @ts-expect-error Providers must return the supported checker methods.
  const wrongProgram: ts.Program = { ...program, getTypeChecker: () => ({}) };
  void wrongProgram;
  void incomplete;
}
it('type-checks the supported provider subset', () => {
  void checkContract;
});
