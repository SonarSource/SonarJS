declare module 'eslint-plugin-jsx-a11y' {
  import type { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
  export const configs: {
    recommended?: {
      rules?: Record<string, unknown>;
    };
  };
}
