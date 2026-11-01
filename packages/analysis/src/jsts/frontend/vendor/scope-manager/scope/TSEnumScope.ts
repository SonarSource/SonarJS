import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class TSEnumScope extends ScopeBase<ScopeType.tsEnum, TSESTree.TSEnumDeclaration, Scope> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: TSEnumScope['upper'],
    block: TSEnumScope['block'],
  ) {
    super(scopeManager, ScopeType.tsEnum, upperScope, block, false);
  }
}
