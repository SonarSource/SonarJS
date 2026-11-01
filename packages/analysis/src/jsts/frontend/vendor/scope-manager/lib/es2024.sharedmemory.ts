// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE } from './base-config.js';
import { es2020_bigint } from './es2020.bigint.js';

export const es2024_sharedmemory: LibDefinition = {
  libs: [es2020_bigint],
  variables: [
    ['Atomics', TYPE],
    ['SharedArrayBuffer', TYPE],
    ['SharedArrayBufferConstructor', TYPE],
  ],
};
