import { type Assignment, type Variable } from './variable';
import { type Scope, createScope as _createScope } from './scope';
import { type FunctionInfo } from './function-info';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Location } from './location';
import { createReference, type Reference } from './values/reference';
import { Value } from './value';

export interface ScopeManager {
  get scopes(): Array<Scope>;

  createValueIdentifier(): number;

  createScope(): Scope;

  addAssignment(key: string, value: Assignment, scopeReference?: Value): void;

  /**
   * Return the nearest assignment to `variable`.
   * todo: improve the documentation
   */
  getAssignment(variable: Variable, scopeReference?: Value): Assignment | null;

  getCurrentScopeIdentifier(): number;
  getScopeFromReference(scopeReference: Value): Scope | null;

  /**
   * Return the nearest variable registered under `name`, alongside its owner.
   * todo: improve the documentation
   */
  getVariableAndOwner(
    name: string,
    scopeReference?: Value,
  ): {
    variable: Variable;
    owner: Scope;
  } | null;

  addVariable(variable: Variable): void;

  getScopeReference(name: string): Reference;

  processFunctionInfo(
    name: string,
    body: Array<TSESTree.Statement>,
    scopeReference: Reference | null,
    parameters: Array<TSESTree.Parameter>,
    location: Location,
  ): FunctionInfo;

  unshiftScope(scope: Scope): void;

  shiftScope(): Scope | undefined;

  // todo: poc
  getParentScope(): Scope | null;
  isChildOfScopeReference(candidate: Reference, scopeReference: Reference): boolean;
}

export const createScopeManager = (
  processFunctionInfo: ScopeManager['processFunctionInfo'],
): ScopeManager => {
  const scopes: Array<Scope> = [];
  const scopeRegistry = new Map<number, Scope>();

  let valueIndex = 0;

  const getCurrentScope = () => scopes[0];

  const getVariableAssigner = (variable: Variable): Scope | null => {
    return (
      scopes.find(scope => {
        return scope.assignments.has(variable.name);
      }) || null
    );
  };

  /**
   * @see {ScopeManager.getAssignment}
   */
  const getAssignment: ScopeManager['getAssignment'] = (variable, scopeReference) => {
    const { name } = variable;

    let scope: Scope | null;

    if (scopeReference) {
      scope = getScopeFromReference(scopeReference);
    } else {
      scope = getVariableAssigner(variable);
    }

    return scope?.assignments.get(name) || null;
  };

  const getScopeFromReference: ScopeManager['getScopeFromReference'] = scopeReference => {
    return scopeRegistry.get(scopeReference.identifier) || null;
  };

  /**
   * @see {ScopeManager.getVariableAndOwner}
   */
  const getVariableAndOwner: ScopeManager['getVariableAndOwner'] = (name, scopeReference) => {
    let owner: Scope | null;

    if (scopeReference) {
      owner = getScopeFromReference(scopeReference);
    } else {
      owner =
        scopes.find(scope => {
          return scope.variables.has(name);
        }) || null;
    }

    if (!owner) {
      return null;
    }

    const variable = owner.variables.get(name);

    return variable
      ? {
          variable,
          owner,
        }
      : null;
  };

  const createScope = (): Scope => {
    return _createScope(valueIndex++);
  };

  const getScopeReference = (name: string) => {
    const variableAndOwner = getVariableAndOwner(name);

    if (variableAndOwner) {
      return createReference(variableAndOwner.owner.identifier);
    }

    // todo: should we return the null value?
    return createReference(getCurrentScope().identifier);
  };

  return {
    get scopes() {
      return scopes;
    },
    createValueIdentifier: () => {
      return valueIndex++;
    },
    createScope,
    getAssignment,
    getVariableAndOwner,
    addVariable(variable: Variable) {
      return getCurrentScope().variables.set(variable.name, variable);
    },
    addAssignment(key: string, value: Assignment, scopeReference) {
      let scope: Scope | null = null;

      if (scopeReference) {
        scope = getScopeFromReference(scopeReference);
      }

      if (!scope) {
        scope = getCurrentScope();
      }

      scope.assignments.set(key, value);
    },
    getCurrentScopeIdentifier() {
      return getCurrentScope().identifier;
    },
    getScopeFromReference,
    processFunctionInfo,
    unshiftScope: scope => {
      scopeRegistry.set(scope.identifier, scope);
      scopes.unshift(scope);
    },
    shiftScope: () => scopes.shift(),
    getScopeReference,
    getParentScope: () => {
      console.log('GET PARENT SCOPE', scopes);

      return scopes.length > 1 ? scopes[1] : null;
    },
    isChildOfScopeReference: (candidate, scopeReference) => {
      const candidateIndex = scopes.findIndex(scope => scope.identifier === candidate.identifier);
      const scopeIndex = scopes.findIndex(scope => scope.identifier === scopeReference.identifier);

      return candidateIndex < scopeIndex;
    },
  };
};

export const createScopeManager2 = (): ScopeManager => {
  const scopes: Array<Scope> = [];
  const scopeRegistry = new Map<number, Scope>();

  let valueIndex = 0;

  const getCurrentScope = () => scopes[0];

  const getVariableAssigner = (variable: Variable): Scope | null => {
    return (
      scopes.find(scope => {
        return scope.assignments.has(variable.name);
      }) || null
    );
  };

  /**
   * @see {ScopeManager.getAssignment}
   */
  const getAssignment: ScopeManager['getAssignment'] = (variable, scopeReference) => {
    const { name } = variable;

    let scope: Scope | null;

    if (scopeReference) {
      scope = getScopeFromReference(scopeReference);
    } else {
      scope = getVariableAssigner(variable);
    }

    return scope?.assignments.get(name) || null;
  };

  const getScopeFromReference: ScopeManager['getScopeFromReference'] = scopeReference => {
    return scopeRegistry.get(scopeReference.identifier) || null;
  };

  /**
   * @see {ScopeManager.getVariableAndOwner}
   */
  const getVariableAndOwner: ScopeManager['getVariableAndOwner'] = (name, scopeReference) => {
    let owner: Scope | null;

    if (scopeReference) {
      owner = getScopeFromReference(scopeReference);
    } else {
      owner =
        scopes.find(scope => {
          return scope.variables.has(name);
        }) || null;
    }

    if (!owner) {
      return null;
    }

    const variable = owner.variables.get(name);

    return variable
      ? {
          variable,
          owner,
        }
      : null;
  };

  const createScope = (): Scope => {
    return _createScope(valueIndex++);
  };

  const getScopeReference = (name: string) => {
    const variableAndOwner = getVariableAndOwner(name);

    if (variableAndOwner) {
      return createReference(variableAndOwner.owner.identifier);
    }

    // todo: should we return the null value?
    return createReference(getCurrentScope().identifier);
  };

  return {
    get scopes() {
      return scopes;
    },
    createValueIdentifier: () => {
      return valueIndex++;
    },
    createScope,
    getAssignment,
    getVariableAndOwner,
    addVariable(variable: Variable) {
      return getCurrentScope().variables.set(variable.name, variable);
    },
    addAssignment(key: string, value: Assignment, scopeReference) {
      console.log('ADD ASSIGNMENT', key, scopeReference);

      let scope: Scope | null = null;

      if (scopeReference) {
        scope = getScopeFromReference(scopeReference);
      }

      if (!scope) {
        scope = getCurrentScope();
      }

      scope.assignments.set(key, value);
    },
    getCurrentScopeIdentifier() {
      return getCurrentScope().identifier;
    },
    getScopeFromReference,
    processFunctionInfo: () => {
      // todo: remove
      return {} as any;
    },
    unshiftScope: scope => {
      scopeRegistry.set(scope.identifier, scope);
      scopes.unshift(scope);
    },
    shiftScope: () => scopes.shift(),
    getScopeReference,
    getParentScope: () => {
      console.log('GET PARENT SCOPE', scopes);

      return scopes.length > 1 ? scopes[1] : null;
    },
    isChildOfScopeReference: (candidate, scopeReference) => {
      const candidateIndex = scopes.findIndex(scope => scope.identifier === candidate.identifier);
      const scopeIndex = scopes.findIndex(scope => scope.identifier === scopeReference.identifier);

      return candidateIndex < scopeIndex;
    },
  };
};

export class ScopeManagerClass {
  scopes: Scope[] = [];
  valueIndex = 0;

  push = (scope: Scope) => {
    this.scopes.unshift(scope);
    return scope;
  };
  pop = (): Scope | undefined => this.scopes.shift();
  getCurrentScope = () => this.scopes[0];
  createScope = () => {
    return _createScope(this.createValueIdentifier());
  };
  createValueIdentifier = () => {
    const result = this.valueIndex;
    this.valueIndex++;
    return result;
  };

  getVariableAssigner = (variable: Variable): Scope | undefined => {
    return this.scopes.find(scope => {
      return scope.assignments.has(variable.name);
    });
  };

  getVariableAndOwner = (name: string) => {
    const owner = this.scopes.find(scope => {
      return scope.variables.has(name);
    });

    if (!owner) {
      return null;
    }

    const variable = owner.variables.get(name);
    return variable
      ? {
          variable,
          owner,
        }
      : null;
  };

  getAssignment = (variable: Variable): Assignment | null => {
    const { name } = variable;

    const scope = this.getVariableAssigner(variable);

    return scope?.assignments.get(name) || null;
  };
}