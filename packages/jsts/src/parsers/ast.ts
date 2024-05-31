import { SourceCode } from 'eslint';
import { visit } from '../linter';
import * as protobuf from 'protobufjs';
import * as path from 'node:path';

const PATH_TO_PROTOFILE = path.join(
  __dirname,
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

export function serializeInProtobuf(sourceCode: SourceCode): Uint8Array {
  // Load the proto file
  const root = protobuf.loadSync(PATH_TO_PROTOFILE);

  const Program = root.lookupType('Program');
  // Create a new Program message
  const message = Program.create(sourceCode.ast);
  // Serialize the message to a buffer
  const buffer = Program.encode(message).finish();

  return buffer;
}
