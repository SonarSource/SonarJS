declare module '@typescript-eslint/eslint-plugin' {
  import { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
