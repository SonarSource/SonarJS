// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE, TYPE_VALUE } from './base-config.js';
import { es2015_symbol_wellknown } from './es2015.symbol.wellknown.js';

export const esnext_weakref: LibDefinition = {
  libs: [es2015_symbol_wellknown],
  variables: [
    ['WeakRef', TYPE_VALUE],
    ['WeakRefConstructor', TYPE],
    ['FinalizationRegistry', TYPE_VALUE],
    ['FinalizationRegistryConstructor', TYPE],
  ],
};
