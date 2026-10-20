// Adapted from typescript-eslint native adapters; see NOTICE.md and LICENSE.
import ts from '../classic.cjs';
function getModifiers(node, includeIllegalModifiers = false) {
  if (!node || (!includeIllegalModifiers && !ts.canHaveModifiers(node))) return void 0;
  const modifiers = ts.getModifiers(node);
  return modifiers ? [...modifiers] : void 0;
}
export { getModifiers };
