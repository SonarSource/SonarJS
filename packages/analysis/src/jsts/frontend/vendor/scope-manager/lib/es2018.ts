// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { es2017 } from './es2017.js';
import { es2018_asyncgenerator } from './es2018.asyncgenerator.js';
import { es2018_asynciterable } from './es2018.asynciterable.js';
import { es2018_intl } from './es2018.intl.js';
import { es2018_promise } from './es2018.promise.js';
import { es2018_regexp } from './es2018.regexp.js';

export const es2018: LibDefinition = {
  libs: [
    es2017,
    es2018_asynciterable,
    es2018_asyncgenerator,
    es2018_promise,
    es2018_regexp,
    es2018_intl,
  ],
  variables: [],
};
