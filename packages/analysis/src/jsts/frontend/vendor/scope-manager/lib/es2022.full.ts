// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { dom } from './dom.js';
import { dom_asynciterable } from './dom.asynciterable.js';
import { dom_iterable } from './dom.iterable.js';
import { es2022 } from './es2022.js';
import { scripthost } from './scripthost.js';
import { webworker_importscripts } from './webworker.importscripts.js';

export const es2022_full: LibDefinition = {
  libs: [es2022, dom, webworker_importscripts, scripthost, dom_iterable, dom_asynciterable],
  variables: [],
};
