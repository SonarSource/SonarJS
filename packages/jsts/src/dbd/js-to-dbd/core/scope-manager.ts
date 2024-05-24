import type { Assignment, Variable } from './variable';
import { type Scope, createScope as _createScope } from './scope';

export class ScopeManager {
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
