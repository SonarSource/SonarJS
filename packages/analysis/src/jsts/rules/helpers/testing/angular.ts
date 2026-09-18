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
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';
const HTTP_TESTING_CONTROLLER_METHODS = new Set(['expectOne', 'expectNone', 'verify']);
const HTTP_TESTING_CONTROLLER_FQN = '"@angular/common/http/testing".HttpTestingController';

export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return false;
  }

  if (!HTTP_TESTING_CONTROLLER_METHODS.has(node.expression.name.text)) {
    return false;
  }

  const typeChecker = services.program.getTypeChecker();
  const type = typeChecker.getTypeAtLocation(node.expression.expression);
  return (
    type.symbol !== undefined &&
    typeChecker.getFullyQualifiedName(type.symbol) === HTTP_TESTING_CONTROLLER_FQN
  );
}
