// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE, TYPE_VALUE } from './base-config.js';
import { es2015_iterable } from './es2015.iterable.js';

export const es2025_iterator: LibDefinition = {
  libs: [es2015_iterable],
  variables: [
    ['Iterator', TYPE_VALUE],
    ['IteratorObjectConstructor', TYPE],
  ],
};
