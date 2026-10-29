// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE_VALUE } from './base-config.js';
import { es2015_symbol_wellknown } from './es2015.symbol.wellknown.js';
import { es2020_intl } from './es2020.intl.js';
import { es2025_intl } from './es2025.intl.js';

export const esnext_temporal: LibDefinition = {
  libs: [es2015_symbol_wellknown, es2020_intl, es2025_intl],
  variables: [['Temporal', TYPE_VALUE]],
};
