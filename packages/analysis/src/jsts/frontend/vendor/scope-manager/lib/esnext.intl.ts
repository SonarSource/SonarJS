// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { TYPE_VALUE } from './base-config.js';
import { esnext_temporal } from './esnext.temporal.js';

export const esnext_intl: LibDefinition = {
  libs: [esnext_temporal],
  variables: [['Intl', TYPE_VALUE]],
};
