declare module 'eslint-plugin-react/lib/util/isCreateElement.js' {
  import type { Rule } from 'eslint';
  import type { Node } from 'estree';

  export default function isCreateElement(context: Rule.RuleContext, node: Node): boolean;
}
