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
