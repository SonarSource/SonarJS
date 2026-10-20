// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { es5 } from './es5.js';
import { es2015_collection } from './es2015.collection.js';
import { es2015_core } from './es2015.core.js';
import { es2015_generator } from './es2015.generator.js';
import { es2015_iterable } from './es2015.iterable.js';
import { es2015_promise } from './es2015.promise.js';
import { es2015_proxy } from './es2015.proxy.js';
import { es2015_reflect } from './es2015.reflect.js';
import { es2015_symbol } from './es2015.symbol.js';
import { es2015_symbol_wellknown } from './es2015.symbol.wellknown.js';

export const es6: LibDefinition = {
  libs: [
    es5,
    es2015_core,
    es2015_collection,
    es2015_iterable,
    es2015_generator,
    es2015_promise,
    es2015_proxy,
    es2015_reflect,
    es2015_symbol,
    es2015_symbol_wellknown,
  ],
  variables: [],
};
