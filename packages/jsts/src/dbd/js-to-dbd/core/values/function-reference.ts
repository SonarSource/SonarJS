import type { BaseValue } from '../value';
import type { FunctionInfo } from '../function-info';

export type FunctionReference = BaseValue<'function_reference'> & {
  functionInfo: FunctionInfo;
};

export const createFunctionReference = (
  functionInfo: FunctionInfo,
  identifier: number,
): FunctionReference => {
  return {
    functionInfo,
    identifier,
    type: 'function_reference',
    users: [],
    typeInfo: undefined,
  };
};
