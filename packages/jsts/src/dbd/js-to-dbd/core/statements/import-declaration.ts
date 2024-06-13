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
  let importValue;
  if (!functionInfo.hasImport(filename)) {
    importValue = createReference(functionInfo.scopeManager.createValueIdentifier());
    functionInfo.addInstructions([
      createCallInstruction(
        importValue.identifier,
        null,
        createFunctionDefinitionFromName('main', filename),
        [],
        node.loc,
      ),
    ]);
    functionInfo.addImport(filename, importValue);
  }
  importValue = functionInfo.getImport(filename);
  return importValue;
}
