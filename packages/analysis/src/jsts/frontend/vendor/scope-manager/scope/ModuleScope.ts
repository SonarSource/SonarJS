import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class ModuleScope extends ScopeBase<ScopeType.module, TSESTree.Program, Scope> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: ModuleScope['upper'],
    block: ModuleScope['block'],
  ) {
    super(scopeManager, ScopeType.module, upperScope, block, false);
  }
}
