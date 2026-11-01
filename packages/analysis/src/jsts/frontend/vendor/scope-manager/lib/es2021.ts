// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { es2020 } from './es2020.js';
import { es2021_intl } from './es2021.intl.js';
import { es2021_promise } from './es2021.promise.js';
import { es2021_string } from './es2021.string.js';
import { es2021_weakref } from './es2021.weakref.js';

export const es2021: LibDefinition = {
  libs: [es2020, es2021_promise, es2021_string, es2021_weakref, es2021_intl],
  variables: [],
};
