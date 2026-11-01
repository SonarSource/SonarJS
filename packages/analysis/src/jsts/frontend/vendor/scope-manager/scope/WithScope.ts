import type { TSESTree } from '../../types/index.js';

import type { ScopeManager } from '../ScopeManager.js';
import type { Scope } from './Scope.js';

import { assert } from '../assert.js';
import { ScopeBase } from './ScopeBase.js';
import { ScopeType } from './ScopeType.js';

export class WithScope extends ScopeBase<ScopeType.with, TSESTree.WithStatement, Scope> {
  constructor(
    scopeManager: ScopeManager,
    upperScope: WithScope['upper'],
    block: WithScope['block'],
  ) {
    super(scopeManager, ScopeType.with, upperScope, block, false);
  }

  public override close(scopeManager: ScopeManager): Scope | null {
    if (this.shouldStaticallyClose()) {
      return super.close(scopeManager);
    }
    assert(this.leftToResolve);
    this.leftToResolve.forEach(ref => this.delegateToUpperScope(ref));
    this.leftToResolve = null;
    return this.upper;
  }
}
