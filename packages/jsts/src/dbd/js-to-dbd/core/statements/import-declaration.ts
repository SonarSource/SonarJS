import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { FunctionInfo } from '../function-info';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createFunctionDefinition } from '../function-definition';
import { createNull } from '../values/constant';
import { Value } from '../value';

export const handleImportDeclaration: StatementHandler<TSESTree.ImportDeclaration> = (
  node,
  functionInfo,
) => {
  const importValue = resolveImportValue(node, functionInfo);
  if (!importValue) {
    console.error(`Unable to resolve import declaration ${node.source}`);
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
  switch (node.type) {
    case AST_NODE_TYPES.ImportNamespaceSpecifier:
    case AST_NODE_TYPES.ImportSpecifier:
    case AST_NODE_TYPES.ImportDefaultSpecifier: {
      const fieldName = node.local.name;
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
        createFunctionDefinition('main', filename),
        [],
        node.loc,
      ),
    ]);
    functionInfo.addImport(filename, importValue);
  }
  importValue = functionInfo.getImport(filename);
  return importValue;
}
