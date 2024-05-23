import {type BaseValue, createValue} from "../value";

export type Null = BaseValue<"null">;

export const createNull = (): Null => {
  return createValue(-1, "null");
};
