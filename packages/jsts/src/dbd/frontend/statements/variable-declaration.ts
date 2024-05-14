import { TSESTree } from '@typescript-eslint/utils';
import { getLocation } from '../utils';
import { handleExpression } from '../expressions';
import { ScopeTranslator } from '../scope-translator';

export function handleVariableDeclaration(
  scopeTranslator: ScopeTranslator,
  declaration: TSESTree.VariableDeclaration,
) {
  if (declaration.declarations.length !== 1) {
    throw new Error(
      `Unable to handle declaration with ${declaration.declarations.length} declarations (${JSON.stringify(getLocation(declaration))})`,
    );
  }
  const declarator = declaration.declarations[0];
  if (!declarator || declarator.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator) {
    throw new Error('Unhandled declaration');
  }
  if (declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier) {
    throw new Error(`Unhandled declaration id type ${declarator.id.type}`);
  }
  const variableName = declarator.id.name;
  return handleExpression(scopeTranslator, declarator.init, variableName);
}
