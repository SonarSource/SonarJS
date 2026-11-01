import type { TSESTree } from '../../types/index.js';

import { DefinitionBase } from './DefinitionBase.js';
import { DefinitionType } from './DefinitionType.js';

export class TSEnumMemberDefinition extends DefinitionBase<
  DefinitionType.TSEnumMember,
  TSESTree.TSEnumMember,
  null,
  TSESTree.Identifier | TSESTree.StringLiteral
> {
  public readonly isTypeDefinition = true;
  public readonly isVariableDefinition = true;

  constructor(
    name: TSESTree.Identifier | TSESTree.StringLiteral,
    node: TSEnumMemberDefinition['node'],
  ) {
    super(DefinitionType.TSEnumMember, name, node, null);
  }
}
