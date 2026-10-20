// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE } from './base-config.js';
import { es2024_collection } from './es2024.collection.js';

export const es2025_collection: LibDefinition = {
  libs: [es2024_collection],
  variables: [
    ['ReadonlySetLike', TYPE],
    ['Set', TYPE],
    ['ReadonlySet', TYPE],
  ],
};
