// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE } from './base-config.js';
import { es2015_iterable } from './es2015.iterable.js';
import { es2020_intl } from './es2020.intl.js';
import { es2020_symbol_wellknown } from './es2020.symbol.wellknown.js';

export const es2020_string: LibDefinition = {
  libs: [es2015_iterable, es2020_intl, es2020_symbol_wellknown],
  variables: [['String', TYPE]],
};
