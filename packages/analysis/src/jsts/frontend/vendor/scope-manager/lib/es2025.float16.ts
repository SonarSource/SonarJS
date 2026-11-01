// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE, TYPE_VALUE } from './base-config.js';
import { es2015_iterable } from './es2015.iterable.js';
import { es2015_symbol } from './es2015.symbol.js';

export const es2025_float16: LibDefinition = {
  libs: [es2015_symbol, es2015_iterable],
  variables: [
    ['Float16Array', TYPE_VALUE],
    ['Float16ArrayConstructor', TYPE],
    ['Math', TYPE],
    ['DataView', TYPE],
  ],
};
