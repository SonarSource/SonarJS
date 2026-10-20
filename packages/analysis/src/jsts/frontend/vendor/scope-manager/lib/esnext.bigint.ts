// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE, TYPE_VALUE } from './base-config.js';
import { es2020_intl } from './es2020.intl.js';

export const esnext_bigint: LibDefinition = {
  libs: [es2020_intl],
  variables: [
    ['BigIntToLocaleStringOptions', TYPE],
    ['BigInt', TYPE_VALUE],
    ['BigIntConstructor', TYPE],
    ['BigInt64Array', TYPE_VALUE],
    ['BigInt64ArrayConstructor', TYPE],
    ['BigUint64Array', TYPE_VALUE],
    ['BigUint64ArrayConstructor', TYPE],
    ['DataView', TYPE],
    ['Intl', TYPE_VALUE],
  ],
};
