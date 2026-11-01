// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE } from './base-config.js';
import { es2018_asynciterable } from './es2018.asynciterable.js';

export const es2018_asyncgenerator: LibDefinition = {
  libs: [es2018_asynciterable],
  variables: [
    ['AsyncGenerator', TYPE],
    ['AsyncGeneratorFunction', TYPE],
    ['AsyncGeneratorFunctionConstructor', TYPE],
  ],
};
