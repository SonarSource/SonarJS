declare module 'eslint-plugin-react-hooks' {
  import type { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
