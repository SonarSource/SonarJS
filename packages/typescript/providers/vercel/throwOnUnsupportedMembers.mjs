// Adapted from typescript-eslint native adapters; see NOTICE.md and LICENSE.
import { CompilerContractError } from '../../errors.cjs';
function throwOnUnsupportedMembers(label, unsupported, implementation) {
  for (const property of unsupported) {
    Object.defineProperty(implementation, property, {
      get() {
        throw new CompilerContractError(
          `${label}#${property} is not available on the Vercel TS7 API.`,
        );
      },
    });
  }
  return implementation;
}
export { throwOnUnsupportedMembers };
