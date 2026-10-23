import type { TSESTree } from '../../types/index.js';

import { DefinitionBase } from './DefinitionBase.js';
import { DefinitionType } from './DefinitionType.js';

export class CatchClauseDefinition extends DefinitionBase<
  DefinitionType.CatchClause,
  TSESTree.CatchClause,
  null,
  TSESTree.Identifier
> {
  public readonly isTypeDefinition = false;
  public readonly isVariableDefinition = true;

  constructor(name: TSESTree.Identifier, node: CatchClauseDefinition['node']) {
    super(DefinitionType.CatchClause, name, node, null);
  }
}
