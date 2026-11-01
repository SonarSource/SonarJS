import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class ClassFieldInitializerScope extends ScopeBase<
  ScopeType.classFieldInitializer,
  // the value expression itself is the block
  TSESTree.Expression,
  Scope
> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: ClassFieldInitializerScope['upper'],
    block: ClassFieldInitializerScope['block'],
  ) {
    super(scopeManager, ScopeType.classFieldInitializer, upperScope, block, false);
  }
}
