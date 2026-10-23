import type { TSESTree } from '../../types/index.js';

import { DefinitionBase } from './DefinitionBase.js';
import { DefinitionType } from './DefinitionType.js';

export class TypeDefinition extends DefinitionBase<
  DefinitionType.Type,
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSMappedType
  | TSESTree.TSTypeAliasDeclaration
  | TSESTree.TSTypeParameter,
  null,
  TSESTree.Identifier
> {
  public readonly isTypeDefinition = true;
  public readonly isVariableDefinition = false;

  constructor(name: TSESTree.Identifier, node: TypeDefinition['node']) {
    super(DefinitionType.Type, name, node, null);
  }
}
