declare module 'eslint-plugin-import' {
  import type { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
