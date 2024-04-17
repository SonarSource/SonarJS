declare module 'jsx-ast-utils' {
  import { TSESTree } from '@typescript-eslint/utils';
  export const hasAnyProp: (any, any) => boolean;
  export const getProp: (
    attributes: (JSXAttribute | JSXSpreadAttribute)[],
    prop: string,
    options?: any,
  ) => JSXAttribute | undefined;
  export const getLiteralPropValue: (attributes: JSXAttribute) => string;
}
