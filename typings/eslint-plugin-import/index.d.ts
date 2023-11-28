declare module 'eslint-plugin-import' {
  import { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
