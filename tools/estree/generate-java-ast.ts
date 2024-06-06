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
import { ESTreeNode, NodeField, NodeFieldValue } from './get-estree-nodes';

const HEADER = `/*
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
`;

const NODE_INTERFACE = `public sealed interface Node {
    
    Location loc();
  }
  
  public record Position(int line, int column) {}
  public record Location(Position start, Position end) {}
`;

const SHARED_FIELDS = ['Location loc'];

export function writeJavaClassesToDir(nodes: Record<string, ESTreeNode>, output: string) {
  const records = [];
  const entries = Object.entries(nodes).sort(([a], [b]) => (a < b ? -1 : 1));
  const ifaces = entries
    .filter(([, node]) => node.fields.length === 1 && 'unionElements' in node.fields[0].fieldValue)
    .map(([name]) => name);

  const impl = new Map<string, string>();
  ifaces.forEach(iface => {
    // @ts-ignore
    const union = nodes[iface].fields[0].fieldValue.unionElements.map(e =>
      upperCaseFirstLetter(e.name),
    );
    for (const u of union) {
      impl.set(u, iface);
    }
  });

  for (const [name, node] of entries) {
    if (ifaces.includes(name)) {
      records.push(`  public sealed interface ${name} extends Node {}`);
    } else {
      const fields = [...SHARED_FIELDS];
      for (const field of node.fields) {
        fields.push(`${javaType(field.fieldValue)} ${javaName(field.name)}`);
      }
      records.push(
        `  public record ${name}(${fields.join(', ')}) implements ${impl.has(name) ? impl.get(name) : 'Node'} {}`,
      );
    }
  }

  const estree = `${HEADER}
package org.sonar.plugins.javascript.api.estree;

import java.util.List;

public class ESTree {

  private ESTree() {
    // shouldn't be instantiated
  }
  
  ${NODE_INTERFACE}  
        
${records.join('\n')}
}

`;
  fs.writeFileSync(output, estree, 'utf-8');
}

function javaType(fieldValue: NodeFieldValue): string {
  if ('type' in fieldValue) {
    switch (fieldValue.type) {
      case 'string':
        return 'String';
      case 'int32':
        return 'int';
      case 'bool':
        return 'boolean';
      case 'BaseNodeWithoutComments':
        return 'Node';
    }
    return fieldValue.type;
  }
  if ('elementValue' in fieldValue) {
    return `List<${javaType(fieldValue.elementValue)}>`;
  }
  return 'Node';
}

function javaName(name: string) {
  if (name === 'static') {
    return 'isStatic';
  }
  return name;
}

function upperCaseFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
