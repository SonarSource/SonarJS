// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE } from './base-config.js';
import { es2015_iterable } from './es2015.iterable.js';
import { es2015_symbol } from './es2015.symbol.js';

export const es2020_symbol_wellknown: LibDefinition = {
  libs: [es2015_iterable, es2015_symbol],
  variables: [
    ['SymbolConstructor', TYPE],
    ['RegExpStringIterator', TYPE],
    ['RegExp', TYPE],
  ],
};
