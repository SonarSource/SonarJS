// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE } from './base-config.js';
import { es2025_collection } from './es2025.collection.js';

export const esnext_collection: LibDefinition = {
  libs: [es2025_collection],
  variables: [
    ['Map', TYPE],
    ['WeakMap', TYPE],
  ],
};
