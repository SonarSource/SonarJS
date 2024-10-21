declare module 'eslint-plugin-jsx-a11y' {
  import type { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
declare module 'eslint-plugin-jsx-a11y/lib/util/getElementType.js' {
  import { TSESTree } from '@typescript-eslint/utils';
  type ESLintSettings = {
    [key: string]: mixed;
    'jsx-a11y'?: {
      polymorphicPropName?: string;
      components?: { [key: string]: string };
    };
  };

  type ESLintContext = {
    options: Array<Object>;
    report: (ESLintReport) => void;
    settings: ESLintSettings;
  };

  const getElementType = (context: ESLintContext): ((node: TSESTree.JSXOpeningElement) => string) =>
    boolean;

  export default getElementType;
}

declare module 'eslint-plugin-jsx-a11y/lib/util/isHiddenFromScreenReader.js' {
  const isHiddenFromScreenReader = (
    type: string,
    attributes: (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[],
  ) => boolean;
  export default isHiddenFromScreenReader;
}
