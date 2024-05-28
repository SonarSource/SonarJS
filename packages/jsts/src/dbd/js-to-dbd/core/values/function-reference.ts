import type { BaseValue } from '../value';
import type { FunctionInfo } from '../function-info';

export type FunctionReference = BaseValue<'function_reference'> & {
  functionInfo: FunctionInfo;
  name: string;
};

export const createFunctionReference = (
  functionInfo: FunctionInfo,
  identifier: number,
  name: string,
): FunctionReference => {
  return {
    functionInfo,
    identifier,
    name,
    type: 'function_reference',
    users: [],
    typeInfo: undefined,
  };
};
