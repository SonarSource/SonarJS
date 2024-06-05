/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ESTreeNode,
  lowerCaseFirstLetter,
  PrimitiveFieldValue,
  TOP_LEVEL_NODE,
} from './get-estree-nodes';

const packageJson = require(path.join('..', '..', 'package.json'));
const typesVersion = packageJson.devDependencies['@types/estree'];

export function addHandWrittenMessages(messages: ESTreeNode[]) {
  // Create node manually for 'RegExpLiteral' and 'TemplateElement'.
  // TODO: Decide how to handle regexp literals.
  messages.push({
    name: 'RegExpLiteral',
    fields: [
      { name: 'pattern', fieldValue: { type: 'string' } },
      { name: 'flags', fieldValue: { type: 'string' } },
      { name: 'raw', fieldValue: { type: 'string' } },
    ],
  });

  messages.push({
    name: 'TemplateElement',
    fields: [
      { name: 'type', fieldValue: { type: 'TemplateElement' } },
      { name: 'tail', fieldValue: { type: 'bool' } },
      { name: 'cooked', fieldValue: { type: 'string' } },
      { name: 'raw', fieldValue: { type: 'string' } },
    ],
  });
}

export function writeMessagesToDir(messages: Record<string, ESTreeNode>, outputDir: string) {
  // When serializing the AST to protobuf, we only need the concrete types (leafs of the AST).
  const concreteMessages = Object.values(messages).filter(m => m.fields[0].name === 'type');

  addHandWrittenMessages(concreteMessages);

  fs.writeFileSync(
    path.join(outputDir, 'estree.proto'),
    addPrefix(translateToProtoFormat(concreteMessages)),
  );
  /**
   * Translate the messages to a protobuf file format.
   */
  function translateToProtoFormat(messages: ESTreeNode[]): string {
    const lines: string[] = [];
    lines.push('enum NodeType {');
    let index = 0;
    for (const message of messages) {
      lines.push(`  ${message.name} = ${index};`);
      index++;
    }
    lines.push('}');

    lines.push('message Node {');
    lines.push('  NodeType type = 1;');
    lines.push('  SourceLocation loc = 2;');
    index = 3;
    lines.push('  oneof node {');
    for (const message of messages) {
      lines.push(`    ${message.name} ${lowerCaseFirstLetter(message.name)} = ${index};`);
      index++;
    }
    lines.push('  }');
    lines.push('}');

    for (const message of Object.values(messages)) {
      let index = 1;
      lines.push(`message ${message.name} {`);
      for (const field of message.fields) {
        if (field.name === 'type') {
          continue;
        }
        if ('elementValue' in field.fieldValue) {
          lines.push(
            `  repeated ${getType((field.fieldValue.elementValue as PrimitiveFieldValue).type)} ${field.name} = ${index};`,
          );
        } else if ('unionElements' in field.fieldValue) {
          lines.push(`  Node ${field.name} = ${index};`);
        } else {
          lines.push(`  ${getType(field.fieldValue.type)} ${field.name} = ${index};`);
        }
        index++;
      }
      lines.push('}');
    }
    return lines.join('\n');
  }

  function getType(t: string) {
    if (t === 'string' || t === 'bool' || t === 'int32' || t === 'Position') {
      return t;
    }
    return 'Node';
  }

  function addPrefix(protoData: string) {
    return `syntax = "proto3";
// Generated for @types/estree version: ${typesVersion}

message SourceLocation {
  string source = 1;
  Position start = 2;
  Position end = 3;
}
message Position {
  int32 line = 1;
  int32 end = 2;
}

${protoData}
`;
  }
}
