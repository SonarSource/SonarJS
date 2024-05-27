import type { Null } from './values/null';
import type { Constant } from './values/constant';
import type { Instruction } from './instruction';
import type { Parameter } from './values/parameter';
import type { TypeName } from './values/type-name';
import type { Reference } from './values/reference';
import { TypeInfo } from './type-info';

export type Value = Constant | Null | Parameter | Reference | TypeName;

export type BaseValue<Type extends string | null> = {
  readonly identifier: number;
  readonly type: Type | null;
  readonly users: Array<Instruction>;
  readonly typeInfo: TypeInfo | undefined;
};

export const createValue = <Type extends string>(
  identifier: number,
  type: Type | null = null,
  typeInfo: TypeInfo | undefined = undefined,
): BaseValue<Type> => {
  return {
    identifier,
    type,
    typeInfo,
    users: [],
  };
};
