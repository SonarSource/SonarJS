import type {Assignment, Variable} from "./variable";

export type Scope = {
    readonly assignments: Map<string, Assignment>;
    readonly variables: Map<string, Variable>;
    readonly identifier: number;
};

export const createScope = (
  identifier: number
): Scope => {
  return {
    assignments: new Map(),
    identifier,
    variables: new Map()
  };
};