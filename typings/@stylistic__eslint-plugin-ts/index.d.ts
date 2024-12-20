declare module '@stylistic/eslint-plugin-ts/rules/*' {
  import type { Rule } from 'eslint';
  const rule: Rule.RuleModule;
  export default rule;
}
