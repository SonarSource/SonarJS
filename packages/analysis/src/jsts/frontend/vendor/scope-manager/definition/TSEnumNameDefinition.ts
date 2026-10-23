import type { TSESTree } from '../../types/index.js';

import { DefinitionBase } from './DefinitionBase.js';
import { DefinitionType } from './DefinitionType.js';

export class TSEnumNameDefinition extends DefinitionBase<
  DefinitionType.TSEnumName,
  TSESTree.TSEnumDeclaration,
  null,
  TSESTree.Identifier
> {
  public readonly isTypeDefinition = true;
  public readonly isVariableDefinition = true;

  constructor(name: TSESTree.Identifier, node: TSEnumNameDefinition['node']) {
    super(DefinitionType.TSEnumName, name, node, null);
  }
}
