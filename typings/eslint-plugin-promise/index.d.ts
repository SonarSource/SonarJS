declare module 'eslint-plugin-promise' {
  import type { Rule } from 'eslint';
  const plugin: {
    rules: { [name: string]: Rule.RuleModule };
    configs: {
      recommended?: {
        rules?: Record<string, unknown>;
      };
    };
  };
  export default plugin;
}
