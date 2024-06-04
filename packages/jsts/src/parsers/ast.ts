import { SourceCode } from 'eslint';
import { visit } from '../linter';
import * as protobuf from 'protobufjs';
import * as path from 'node:path';
import * as _ from 'lodash';
import * as estree from 'estree';

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
const PROTO_ROOT = protobuf.loadSync(PATH_TO_PROTOFILE);
const PROGRAM_TYPE = PROTO_ROOT.lookupType('Program');

export function parseAst(sourceCode: SourceCode): any {
  return sourceCode.ast;
}

export function gatherAstNodes(sourceCode: SourceCode): any {
  const nodes: any[] = [];
  visit(sourceCode, node => nodes.push(node));
  return nodes;
}

export function verifyProtobuf(sourceCode: SourceCode): any {
  PROGRAM_TYPE.verify(sourceCode.ast) === null;
}

export function serializeInProtobuf(sourceCode: SourceCode): Uint8Array {
  // Create a new Program message
  const message = PROGRAM_TYPE.create(sourceCode.ast);
  // Serialize the message to a buffer
  const buffer = PROGRAM_TYPE.encode(message).finish();

  return buffer;
}

export function serializeOne(sourceCode: SourceCode): protobuf.Message<{}> {
  //let output = {};
  const node = sourceCode.ast;
  const filteredNode = _.pick(node, sourceCode.visitorKeys[node.type]);
  const message = PROTO_ROOT.lookupType(node.type);
  return message.fromObject(filteredNode);
  // visit(sourceCode, node => {
  //   const filteredNode = _.pick(node, sourceCode.visitorKeys[node.type]);
  //   const message = PROTO_ROOT.lookupType(node.type);
  //   message.fromObject(filteredNode);
  // });
}

export function serialize(
  node: estree.Node,
  sourceCode: SourceCode,
): protobuf.Message<{}> | undefined {
  const childProps = sourceCode.visitorKeys[node.type];
  const res: any = {};
  for (const key of Object.keys(node) as Array<keyof estree.Node>) {
    const value = node[key];
    if (!value) {
      continue;
    }
    if (childProps.includes(key)) {
      res[key] = serializeArray(value as any, sourceCode);
    } else {
      res[key] = node[key];
    }
  }
  const message = PROTO_ROOT.lookupType(node.type);
  if (message) {
    try {
      return message.fromObject(node);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  } else {
    return undefined;
  }
}

function serializeArray(node: estree.Node, sourceCode: SourceCode) {
  if (!Array.isArray(node)) {
    return serialize(node, sourceCode);
  }
  const res = [];
  for (const n of node) {
    res.push(serialize(n, sourceCode));
  }
  return res;
}

export function deserializeFromProtobuf(buffer: Uint8Array): any {
  const message = PROGRAM_TYPE.decode(buffer);
  return PROGRAM_TYPE.toObject(message);
}
