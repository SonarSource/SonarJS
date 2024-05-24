import type { Block } from './block';
import type { FunctionDefinition } from './function-definition';

export type FunctionInfo = {
  readonly blocks: Array<Block>;
  readonly fileName: string;
  readonly definition: FunctionDefinition;
};

export const createFunctionInfo = (
  fileName: string,
  definition: FunctionDefinition,
  blocks: Array<Block> = [],
): FunctionInfo => {
  return {
    definition,
    blocks,
    fileName,
  };
};
