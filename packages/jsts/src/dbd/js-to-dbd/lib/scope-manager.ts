import type {Assignment, Variable} from "./variable";
import type {Scope} from "./scope";

export type ScopeManager = {
  createValueIdentifier: () => number;

  /**
   * Return the nearest assignment to `variable`.
   */
  getAssignment: (variable: Variable) => Assignment | null;

  /**
   * Return the nearest variable registered under `name`, alongside its owner.
   */
  getVariableAndOwner: (name: string) => {
    variable: Variable;
    owner: Scope;
  } | null;
}