import type { Constant } from './values/constant';
import type { Instruction } from './instruction';
import type { Parameter } from './values/parameter';
import type { TypeName } from './values/type-name';
import type { Reference } from './values/reference';
import type { TypeInfo } from './type-info';
import type { FunctionReference } from './values/function-reference';

export type Value = Constant | FunctionReference | Parameter | Reference | TypeName;

/**
 * The implementation of the concept of [ECMAScript Language Value](https://262.ecma-international.org/14.0/#sec-ecmascript-language-types)
 *
 * @todo Maybe rename as ECMAScriptLanguageValue to better convey this stance
 */
export type BaseValue<Type extends string | null> = {
  readonly bindings: {
    get(key: string): BaseValue<any> | undefined;
    has(key: string): boolean;
    set(key: string, value: BaseValue<any>): void;
  };
  readonly identifier: number;
  readonly type: Type | null;
  readonly typeInfo: TypeInfo | undefined;
  readonly users: Array<Instruction>; // todo: probably not needed
};

export const createValue = <Type extends string>(
  type: Type | null = null,
  identifier: number,
  typeInfo: TypeInfo | undefined = undefined,
): BaseValue<Type> => {
  return {
    bindings: new Map(),
    identifier,
    type,
    typeInfo,
    users: [],
  };
};
