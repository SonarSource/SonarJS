import { type Assignment, type Variable } from './variable';
import { type Scope, createScope as _createScope } from './scope';
import type { FunctionInfo } from './function-info';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Location } from './location';
import { type Block, createBlock } from './block';
import { createReference, type Reference } from './values/reference';
import { Value } from './value';

export interface ScopeManager {
  createValueIdentifier(): number;

  createScope(): Scope;

  createScopedBlock(location: Location): Block;

  addAssignment(key: string, value: Assignment): void;

  /**
   * Return the nearest assignment to `variable`.
   */
  getAssignment(variable: Variable, scope?: Value): Assignment | null;

  getCurrentScopeIdentifier(): number;
  getScopeFromRegistry(scopeValue: Value): Scope | null;

  /**
   * Return the nearest variable registered under `name`, alongside its owner.
   */
  getVariableAndOwner(
    name: string,
    scope?: Value,
  ): {
    variable: Variable;
    owner: Scope;
  } | null;

  addVariable(variable: Variable): void;

  getFunctionInfo(name: string): FunctionInfo | null;

  getScopeReference(name: string): Reference;

  processFunctionInfo(
    name: string,
    body: Array<TSESTree.Statement>,
    parameters: Array<TSESTree.Parameter>,
    location: Location,
  ): FunctionInfo;

  unshiftScope(scope: Scope): void;

  shiftScope(): Scope | undefined;
  scopeRegistry: Map<number, Scope>;
}

export const createScopeManager = (
  functionInfos: Array<FunctionInfo>,
  processFunctionInfo: ScopeManager['processFunctionInfo'],
): ScopeManager => {
  const scopes: Array<Scope> = [];

  let blockIndex: number = 0;
  let valueIndex = 0;
  const scopeRegistry = new Map<number, Scope>();

  const getCurrentScope = () => scopes[0];

  const getVariableAssigner = (variable: Variable): Scope | undefined => {
    return scopes.find(scope => {
      return scope.assignments.has(variable.name);
    });
  };

  /**
   * @see {ScopeManager.getAssignment}
   */
  const getAssignment: ScopeManager['getAssignment'] = (variable, scopeValue) => {
    const { name } = variable;
    if (scopeValue && scopeRegistry.has(scopeValue.identifier)) {
      return scopeRegistry.get(scopeValue.identifier)!.assignments.get(name) || null;
    }

    const scope = getVariableAssigner(variable);

    return scope?.assignments.get(name) || null;
  };

  /**
   * @see {ScopeManager.getVariableAndOwner}
   */
  const getVariableAndOwner: ScopeManager['getVariableAndOwner'] = (name, scope) => {
    if (scope && scopeRegistry.has(scope.identifier)) {
      const relevantScope = scopeRegistry.get(scope.identifier);
      const variable = relevantScope?.variables.get(name);
      if (variable) {
        return {
          owner: relevantScope!,
          variable,
        };
      }
    }
    const owner = scopes.find(scope => {
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

  const createScopedBlock = (location: Location): Block => {
    return createBlock(getCurrentScope(), blockIndex++, location);
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
    createValueIdentifier: () => {
      return valueIndex++;
    },
    createScopedBlock,
    createScope,
    getAssignment,
    getVariableAndOwner,
    addVariable(variable: Variable) {
      return getCurrentScope().variables.set(variable.name, variable);
    },
    addAssignment(key: string, value: Assignment) {
      getCurrentScope().assignments.set(key, value);
    },
    getCurrentScopeIdentifier() {
      return getCurrentScope().identifier;
    },
    getScopeFromRegistry(scope) {
      return scopeRegistry.get(scope.identifier) || null;
    },
    getFunctionInfo(name) {
      return (
        functionInfos.find(functionInfo => {
          return functionInfo.definition.name === name;
        }) || null
      );
    },
    processFunctionInfo,
    unshiftScope: scope => {
      scopeRegistry.set(scope.identifier, scope);
      scopes.unshift(scope);
    },
    shiftScope: () => scopes.shift(),
    getScopeReference,
    scopeRegistry,
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
