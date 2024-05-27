export type Assignment = {
  readonly identifier: number;
  readonly variable: Variable;
};

export const createAssignment = (identifier: number, variable: Variable): Assignment => {
  return {
    identifier,
    variable,
  };
};

export type Variable = {
  readonly name: string;
  readonly type: string;
  readonly writable: boolean;
};

export const createVariable = (
  name: string,
  type: string | 'unknown' = 'unknown',
  writable: boolean = true,
): Variable => {
  return {
    name,
    type,
    writable,
  };
};
