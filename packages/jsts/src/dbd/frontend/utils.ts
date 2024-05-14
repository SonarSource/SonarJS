import { TSESTree } from '@typescript-eslint/utils';
import { Location } from '../ir-gen/ir_pb';

export function getLocation(node: TSESTree.Node) {
  return new Location({
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
    startColumn: node.loc.start.column,
    endColumn: node.loc.end.column,
  });
}
