// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { es2025 } from './es2025.js';
import { esnext_array } from './esnext.array.js';
import { esnext_collection } from './esnext.collection.js';
import { esnext_date } from './esnext.date.js';
import { esnext_decorators } from './esnext.decorators.js';
import { esnext_disposable } from './esnext.disposable.js';
import { esnext_error } from './esnext.error.js';
import { esnext_intl } from './esnext.intl.js';
import { esnext_sharedmemory } from './esnext.sharedmemory.js';
import { esnext_temporal } from './esnext.temporal.js';
import { esnext_typedarrays } from './esnext.typedarrays.js';

export const esnext: LibDefinition = {
  libs: [
    es2025,
    esnext_intl,
    esnext_collection,
    esnext_decorators,
    esnext_disposable,
    esnext_array,
    esnext_error,
    esnext_sharedmemory,
    esnext_typedarrays,
    esnext_temporal,
    esnext_date,
  ],
  variables: [],
};
