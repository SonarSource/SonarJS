declare module 'jsx-ast-utils' {
  import type { TSESTree } from '@typescript-eslint/utils';
  export const hasAnyProp: (any, any) => boolean;
  export const getProp: (
    attributes: (JSXAttribute | JSXSpreadAttribute)[],
    prop: string,
    options?: any,
  ) => JSXAttribute | undefined;
  export const getPropValue: (attribute: JSXAttribute) => string | boolean | undefined;
  export const getLiteralPropValue: (attributes: JSXAttribute) => string | boolean | undefined;
  export const elementType: (node) => string;
}
