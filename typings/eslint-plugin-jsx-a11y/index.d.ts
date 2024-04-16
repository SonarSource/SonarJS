declare module 'eslint-plugin-jsx-a11y' {
  import { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
declare module 'eslint-plugin-jsx-a11y/lib/util/getElementType' {
  import { TSESTree } from '@typescript-eslint/utils';
  import { boolean } from '../../its/sources/jsts/projects/vscode/src/vs/editor/common/config/editorOptions';
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
