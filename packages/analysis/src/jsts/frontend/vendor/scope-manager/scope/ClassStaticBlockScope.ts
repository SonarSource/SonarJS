import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class ClassStaticBlockScope extends ScopeBase<
  ScopeType.classStaticBlock,
  TSESTree.StaticBlock,
  Scope
> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: ClassStaticBlockScope['upper'],
    block: ClassStaticBlockScope['block'],
  ) {
    super(scopeManager, ScopeType.classStaticBlock, upperScope, block, false);
  }
}
