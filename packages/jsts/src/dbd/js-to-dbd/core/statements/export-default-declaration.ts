import { StatementHandler } from '../statement-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { handleExpression } from '../expressions';

export const handleExportDefaultDeclaration: StatementHandler<TSESTree.ExportDefaultDeclaration> = (
  node,
  functionInfo,
) => {
  const { declaration } = node;
  if (declaration.type !== AST_NODE_TYPES.Identifier) {
    console.error(`Unhandled export default declaration ${declaration.type}`);
    return;
  }
  const result = handleExpression(declaration, functionInfo);
  functionInfo.addDefaultExport(result);
};
