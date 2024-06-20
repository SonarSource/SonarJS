/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { FunctionInfo } from '../function-info';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createFunctionDefinitionFromName,
  createGetFieldFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { Value } from '../value';
import { unresolvable } from '../scope-manager';
import { executeCall } from '../expressions/call-expression';

export const handleImportDeclaration: StatementHandler<TSESTree.ImportDeclaration> = (
  node,
  functionInfo,
) => {
  const importValue = resolveImportValue(node, functionInfo);
  if (!importValue) {
    console.error(`Unable to resolve import declaration ${node.source.value}`);
    return;
  }
  for (const specifier of node.specifiers) {
    handleSpecifier(specifier, functionInfo, importValue);
  }
};

function handleSpecifier(
  node: TSESTree.ImportClause,
  functionInfo: FunctionInfo,
  importValue: Value,
) {
  const { scopeManager } = functionInfo;
  const referenceIdentifier = scopeManager.getIdentifierReference(node.local);
  if (referenceIdentifier.base === unresolvable) {
    console.error(`Unresolved import name ${node.local.name}`);
    return;
  }
  const scopeReference = createReference(
    scopeManager.getScopeId(referenceIdentifier.variable.scope),
  );

  const setImportedField = (extractedValue: Value) => {
    functionInfo.addInstructions([
      createCallInstruction(
        scopeManager.createValueIdentifier(),
        null,
        createSetFieldFunctionDefinition(node.local.name),
        [scopeReference, extractedValue],
        node.loc,
      ),
    ]);
  };

  const getImportedValue = (exportedField: string) => {
    const extractedValue = createReference(scopeManager.createValueIdentifier());
    functionInfo.addInstructions([
      createCallInstruction(
        extractedValue.identifier,
        null,
        createGetFieldFunctionDefinition(exportedField),
        [importValue],
        node.loc,
      ),
    ]);
    return extractedValue;
  };

  switch (node.type) {
    case AST_NODE_TYPES.ImportNamespaceSpecifier:
      setImportedField(importValue);
      break;
    case AST_NODE_TYPES.ImportSpecifier: {
      const extractedValue = getImportedValue(node.imported.name);
      setImportedField(extractedValue);
      break;
    }
    case AST_NODE_TYPES.ImportDefaultSpecifier: {
      const extractedDefault = getImportedValue('default');
      setImportedField(extractedDefault);
      break;
    }
  }
}

function resolveImportValue(node: TSESTree.ImportDeclaration, functionInfo: FunctionInfo) {
  const services = functionInfo.scopeManager.getParserServices();
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node.specifiers[0]));
  if (!type?.symbol) {
    return null;
  }
  if (type.symbol.declarations?.length && type.symbol.declarations?.length !== 1) {
    console.error(
      `Unexpected number of declarations in ImportClause ${type.symbol.declarations?.length}`,
    );
  }
  const filename = type.symbol.declarations?.[0]?.getSourceFile()?.fileName;
  if (!filename) {
    console.error(`Unable to resolve filename at ${node.range}`);
    return null;
  }
  if (!functionInfo.hasImport(filename)) {
    functionInfo.addImport(
      filename,
      executeCall(createFunctionDefinitionFromName('main', filename), functionInfo, [], node.loc),
    );
  }
  return functionInfo.getImport(filename);
}
