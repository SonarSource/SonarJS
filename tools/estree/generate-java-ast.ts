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

const NODE_INTERFACE = `sealed interface Node {
    
    String type();
    Location loc();
  }
  
  public record Location(int startLine, int startCol, int endLine, int endCol) {}
`;

const SHARED_FIELDS = ['String type', 'Location loc'];

export function writeJavaClassesToDir(nodes: Record<string, ESTreeNode>, output: string) {
  const records = [];
  for (const [name, node] of Object.entries(nodes)) {
    const fields = [...SHARED_FIELDS];
    for (const field of node.fields) {
      fields.push(`${javaType(field.fieldValue)} ${javaName(field.name)}`);
    }
    records.push(`  public record ${name}(${fields.join(', ')}) implements Node {}`);
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
  fs.writeFileSync('output/ESTree.java', estree, 'utf-8');
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
