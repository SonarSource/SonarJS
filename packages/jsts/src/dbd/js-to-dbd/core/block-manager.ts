import { Block, createBlock } from './block';
import type { Location } from './location';
import type { EnvironmentRecord } from './ecma/environment-record';

export interface BlockManager {
  readonly blocks: Array<Block>;

  createBlock(environmentRecord: EnvironmentRecord, location: Location): Block;

  getCurrentBlock(): Block;

  pushBlock(block: Block): void;
}

export const createBlockManager = (): BlockManager => {
  const blocks: Array<Block> = [];

  let blockIndex: number = 0;

  return {
    blocks,
    createBlock: (environmentRecord, location) => {
      return createBlock(environmentRecord, blockIndex++, location);
    },
    getCurrentBlock() {
      return blocks[blocks.length - 1];
    },
    pushBlock: block => {
      blocks.push(block);
    },
  };
};
