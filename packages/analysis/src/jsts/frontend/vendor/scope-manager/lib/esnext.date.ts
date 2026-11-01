// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE } from './base-config.js';
import { esnext_temporal } from './esnext.temporal.js';

export const esnext_date: LibDefinition = {
  libs: [esnext_temporal],
  variables: [['Date', TYPE]],
};
