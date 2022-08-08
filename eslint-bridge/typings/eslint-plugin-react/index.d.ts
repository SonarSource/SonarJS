declare module 'eslint-plugin-react' {
  import { Rule } from "eslint";
  export const rules: { [name: string]: Rule.RuleModule };
}
