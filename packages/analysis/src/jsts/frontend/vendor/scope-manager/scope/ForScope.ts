import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class ForScope extends ScopeBase<
  ScopeType.for,
  TSESTree.ForInStatement | TSESTree.ForOfStatement | TSESTree.ForStatement,
  Scope
> {
  constructor(scopeManager: ScopeManager, upperScope: ForScope['upper'], block: ForScope['block']) {
    super(scopeManager, ScopeType.for, upperScope, block, false);
  }
}
