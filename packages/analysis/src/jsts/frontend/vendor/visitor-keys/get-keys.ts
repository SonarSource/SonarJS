import type { TSESTree } from '../types/index.js';

import { getKeys as getKeysOriginal } from 'eslint-visitor-keys';

export const getKeys: (node: TSESTree.Node) => readonly string[] = getKeysOriginal;
