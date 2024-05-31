import { SourceCode } from 'eslint';
import { visit } from '../linter';
import * as protobuf from 'protobufjs';
import * as path from 'node:path';

const PATH_TO_PROTOFILE = path.join(
  '..',
  '..',
  '..',
  '..',
  'tools',
  'protobuf',
  'output',
  'estree.proto',
);

export function parseAst(sourceCode: SourceCode): any {
  return sourceCode.ast;
}

export function gatherAstNodes(sourceCode: SourceCode): any {
  const nodes: any[] = [];
  visit(sourceCode, node => nodes.push(node));
  return nodes;
}

export function serializeInProtobuf(sourceCode: SourceCode): any {
  const nodes = gatherAstNodes(sourceCode);

  const root = protobuf.loadSync(PATH_TO_PROTOFILE);
  root.lookupTypeOrEnum('');
}
