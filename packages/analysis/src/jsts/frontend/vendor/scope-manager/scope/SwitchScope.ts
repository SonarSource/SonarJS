import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class SwitchScope extends ScopeBase<ScopeType.switch, TSESTree.SwitchStatement, Scope> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: SwitchScope['upper'],
    block: SwitchScope['block'],
  ) {
    super(scopeManager, ScopeType.switch, upperScope, block, false);
  }
}
