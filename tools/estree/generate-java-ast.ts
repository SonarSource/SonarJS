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
import { ESTreeNode, NodeField } from './get-estree-nodes';

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

export function writeJavaClassesToDir(nodes: Record<string, ESTreeNode>, output: string) {
  const records = [];
  for (const [name, node] of Object.entries(nodes)) {
    const fields = [];
    for (const field of node.fields) {
      fields.push(`${javaType(field)} ${javaName(field.name)}`);
    }
    records.push(`  public record ${name}(${fields.join(', ')}) implements Node {}`);
  }

  const estree = `${HEADER}
package org.sonar.plugins.javascript.api.estree;


public class ESTree {

  private ESTree() {
    // shouldn't be instantiated
  }
  
  sealed interface Node {

  }
${records.join('\n')}
}

`;
  fs.writeFileSync('output/ESTree.java', estree, 'utf-8');
}

function javaType(field: NodeField) {
  const { fieldValue } = field;
  if ('type' in fieldValue) {
    switch (fieldValue.type) {
      case 'string':
        return 'String';
      case 'int32':
        return 'int';
      case 'bool':
        return 'boolean';
    }
    return fieldValue.type;
  }
  return 'Node';
}

function javaName(name: string) {
  if (name === 'static') {
    return 'isStatic';
  }
  return name;
}
