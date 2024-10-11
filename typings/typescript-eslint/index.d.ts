declare module '@typescript-eslint/eslint-plugin' {
  import type { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
