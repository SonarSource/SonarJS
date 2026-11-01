// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { es2019 } from './es2019.js';
import { es2020_bigint } from './es2020.bigint.js';
import { es2020_date } from './es2020.date.js';
import { es2020_intl } from './es2020.intl.js';
import { es2020_number } from './es2020.number.js';
import { es2020_promise } from './es2020.promise.js';
import { es2020_sharedmemory } from './es2020.sharedmemory.js';
import { es2020_string } from './es2020.string.js';
import { es2020_symbol_wellknown } from './es2020.symbol.wellknown.js';

export const es2020: LibDefinition = {
  libs: [
    es2019,
    es2020_bigint,
    es2020_date,
    es2020_number,
    es2020_promise,
    es2020_sharedmemory,
    es2020_string,
    es2020_symbol_wellknown,
    es2020_intl,
  ],
  variables: [],
};
