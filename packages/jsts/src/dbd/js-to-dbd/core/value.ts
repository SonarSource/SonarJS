import type { Constant } from './values/constant';
import type { Parameter } from './values/parameter';
import type { TypeName } from './values/type-name';
import type { Reference } from './values/reference';
import type { FunctionReference } from './values/function-reference';

export type Value = Constant | FunctionReference | Parameter | Reference | TypeName;

/**
 * The implementation of the concept of [ECMAScript Language Value](https://262.ecma-international.org/14.0/#sec-ecmascript-language-types)
 *
 * @todo Maybe rename as ECMAScriptLanguageValue to better convey this stance
 */
export type BaseValue<Type extends string | null> = {
  readonly identifier: number;
  readonly type: Type | null;
};

export const createValue = <Type extends string>(
  type: Type,
  identifier: number,
): BaseValue<Type> => {
  return {
    identifier,
    type,
  };
};
