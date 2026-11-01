// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { dom } from './dom.js';
import { es5 } from './es5.js';
import { scripthost } from './scripthost.js';
import { webworker_importscripts } from './webworker.importscripts.js';

export const lib: LibDefinition = {
  libs: [es5, dom, webworker_importscripts, scripthost],
  variables: [],
};
