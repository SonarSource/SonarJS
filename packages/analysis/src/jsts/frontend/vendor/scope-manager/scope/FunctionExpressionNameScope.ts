import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { FunctionNameDefinition } from '../definition/index.js';
import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class FunctionExpressionNameScope extends ScopeBase<
  ScopeType.functionExpressionName,
  TSESTree.FunctionExpression,
  Scope
> {
  public override readonly functionExpressionScope: true;

  constructor(
    scopeManager: ScopeManager,
    upperScope: FunctionExpressionNameScope['upper'],
    block: FunctionExpressionNameScope['block'],
  ) {
    super(scopeManager, ScopeType.functionExpressionName, upperScope, block, false);
    if (block.id) {
      this.defineIdentifier(block.id, new FunctionNameDefinition(block.id, block));
    }
    this.functionExpressionScope = true;
  }
}
