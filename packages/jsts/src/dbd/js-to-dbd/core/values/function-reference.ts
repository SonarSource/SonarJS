import type { FunctionInfo } from '../function-info';
import { createReference, type Reference } from './reference';

export type FunctionReference = Reference & {
  functionInfo: FunctionInfo;
};

export const createFunctionReference = (
  functionInfo: FunctionInfo,
  identifier: number,
): FunctionReference => {
  return {
    ...createReference(identifier),
    functionInfo,
  };
};
