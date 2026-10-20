import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class MappedTypeScope extends ScopeBase<ScopeType.mappedType, TSESTree.TSMappedType, Scope> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: MappedTypeScope['upper'],
    block: MappedTypeScope['block'],
  ) {
    super(scopeManager, ScopeType.mappedType, upperScope, block, false);
  }
}
