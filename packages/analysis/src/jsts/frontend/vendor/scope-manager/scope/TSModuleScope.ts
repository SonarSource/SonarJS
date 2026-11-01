import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class TSModuleScope extends ScopeBase<
  ScopeType.tsModule,
  TSESTree.TSModuleDeclaration,
  Scope
> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: TSModuleScope['upper'],
    block: TSModuleScope['block'],
  ) {
    super(scopeManager, ScopeType.tsModule, upperScope, block, false);
  }
}
