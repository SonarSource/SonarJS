import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { compileAsAssignment, handleExpression } from '../expressions';
import { createNull } from '../values/constant';

export const handleVariableDeclaration: StatementHandler<TSESTree.VariableDeclaration> = (
  node,
  functionInfo,
) => {
  for (const declaration of node.declarations) {
    const { init, id } = declaration;
    const initValue = init ? handleExpression(init, functionInfo) : createNull();
    compileAsAssignment(id, functionInfo, initValue);
  }
};
