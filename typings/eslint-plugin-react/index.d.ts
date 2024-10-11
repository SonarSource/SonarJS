declare module 'eslint-plugin-react' {
  import type { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
