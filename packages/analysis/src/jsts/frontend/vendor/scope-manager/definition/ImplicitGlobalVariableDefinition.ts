import type { NodeWithParent, TSESTree } from '../../types/index.js';

import { DefinitionBase } from './DefinitionBase.js';
import { DefinitionType } from './DefinitionType.js';

export class ImplicitGlobalVariableDefinition extends DefinitionBase<
  DefinitionType.ImplicitGlobalVariable,
  NodeWithParent,
  null,
  TSESTree.BindingName
> {
  public readonly isTypeDefinition = false;
  public readonly isVariableDefinition = true;

  constructor(name: TSESTree.BindingName, node: ImplicitGlobalVariableDefinition['node']) {
    super(DefinitionType.ImplicitGlobalVariable, name, node, null);
  }
}
