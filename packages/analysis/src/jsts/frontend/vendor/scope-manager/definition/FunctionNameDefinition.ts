import type { TSESTree } from '../../types/index.js';

import { DefinitionBase } from './DefinitionBase.js';
import { DefinitionType } from './DefinitionType.js';

export class FunctionNameDefinition extends DefinitionBase<
  DefinitionType.FunctionName,
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.TSDeclareFunction
  | TSESTree.TSEmptyBodyFunctionExpression,
  null,
  TSESTree.Identifier
> {
  public readonly isTypeDefinition = false;
  public readonly isVariableDefinition = true;

  constructor(name: TSESTree.Identifier, node: FunctionNameDefinition['node']) {
    super(DefinitionType.FunctionName, name, node, null);
  }
}
