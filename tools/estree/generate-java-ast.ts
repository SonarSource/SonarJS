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
import {
  ArrayLikeFieldValue,
  ESTreeNode,
  NodeField,
  NodeFieldValue,
  UnionFieldValue,
} from './get-estree-nodes';

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

const OPERATORS = `  public interface Operator {
    String raw();
  }

  public enum UnaryOperator implements Operator {
    MINUS("-"), PLUS("+"), LOGICAL_NOT("!"), BITWISE_NOT("~"), TYPEOF("typeof"), VOID("void"), DELETE("delete");

    private final String raw;

    UnaryOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }
  }
  
  public enum BinaryOperator implements Operator {
    EQUAL("=="), 
    NOT_EQUAL("!="), 
    STRICT_EQUAL("==="), 
    STRICT_NOT_EQUAL("!=="), 
    LESS_THAN("<"), 
    LESS_THAN_OR_EQUAL("<="), 
    GREATER_THAN(">"), 
    GREATER_THAN_OR_EQUAL(">="), 
    LEFT_SHIFT("<<"), 
    RIGHT_SHIFT(">>"), 
    UNSIGNED_RIGHT_SHIFT(">>>"), 
    PLUS("+"), 
    MINUS("-"), 
    MULTIPLY("*"), 
    DIVIDE("/"), 
    MODULO("%"), 
    EXPONENTIATION("**"), 
    BITWISE_AND("&"), 
    BITWISE_OR("|"), 
    BITWISE_XOR("^"), 
    IN("in"), 
    INSTANCEOF("instanceof");

    private final String raw;

    BinaryOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }
  }
  
  public enum LogicalOperator implements Operator {
    AND("&&"), OR("||"), NULLISH_COALESCING("??");

    private final String raw;

    LogicalOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }
  }
  
  public enum AssignmentOperator implements Operator {
    ASSIGN("="), 
    PLUS_ASSIGN("+="), 
    MINUS_ASSIGN("-="), 
    MULTIPLY_ASSIGN("*="), 
    DIVIDE_ASSIGN("/="), 
    MODULO_ASSIGN("%="),
    EXPONENTIATION_ASSIGN("**="),
    LEFT_SHIFT_ASSIGN("<<="),
    RIGHT_SHIFT_ASSIGN(">>="),
    UNSIGNED_RIGHT_SHIFT_ASSIGN(">>>="),
    BITWISE_OR_ASSIGN("|="),
    BITWISE_XOR_ASSIGN("^="),
    BITWISE_AND_ASSIGN("&="),
    LOGICAL_OR_ASSIGN("||="),
    LOGICAL_AND_ASSIGN("&&="),
    NULLISH_COALESCING_ASSIGN("??=")
    ;

    private final String raw;

    AssignmentOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }
  }
  
  public enum UpdateOperator implements Operator {
    INCREMENT("++"), DECREMENT("--");

    private final String raw;

    UpdateOperator(String raw) {
      this.raw = raw;
    }

    @Override
    public String raw() {
      return raw;
    }
  }`;

function isUnionNode(node: ESTreeNode) {
  return node.fields.length === 1 && 'unionElements' in node.fields[0].fieldValue;
}

function isPrimitive(f: NodeField) {
  const fv = f.fieldValue;
  return 'type' in fv && ['string', 'int32', 'bool'].some(s => s === fv.type);
}

export function writeJavaClassesToDir(nodes: Record<string, ESTreeNode>, output: string) {
  // remove operators, they are hardcoded as enums
  [
    'UnaryOperator',
    'BinaryOperator',
    'LogicalOperator',
    'AssignmentOperator',
    'UpdateOperator',
  ].forEach(o => delete nodes[o]);

  const entries = Object.entries(nodes).sort(([a], [b]) => (a < b ? -1 : 1));
  const ifaces = entries.filter(([, n]) => isUnionNode(n)).map(([name]) => name);

  const impl = new Map<string, string[]>();
  ifaces
    .filter(i => isUnionNode(nodes[i]))
    .forEach(iface => {
      //@ts-ignore
      const union = nodes[iface].fields[0].fieldValue.unionElements.map(e =>
        upperCaseFirstLetter(e.name),
      );
      for (const u of union) {
        if (impl.has(u)) {
          impl.set(u, impl.get(u)!.concat(iface));
        } else {
          impl.set(u, [iface]);
        }
      }
    });

  nodes['Literal'].fields = [
    {
      name: 'raw',
      fieldValue: { type: 'string' },
    },
  ];
  nodes['ChainElement'].fields = [
    {
      name: 'optional',
      fieldValue: { type: 'bool' },
    },
  ];
  nodes['CallExpression'].fields = [
    {
      name: 'callee',
      fieldValue: { type: 'ExpressionOrSuper' }, // more precise type is Expression | Super, but we can't represent union types in Java easily
    },
    {
      name: 'arguments',
      fieldValue: { type: `List<ExpressionOrSpreadElement>` },
    },
  ];
  nodes['BigIntLiteral'].fields[0].fieldValue = { type: 'BigInteger' };

  const records = [];
  const ifaceSrc: string[] = [];
  const unionIfaces: string[] = [];
  for (const [name, node] of entries) {
    if (!ifaces.includes(name)) {
      const fields = [...SHARED_FIELDS];
      for (const field of node.fields) {
        if (field.name === 'type') {
          // ignore 'type' field
          continue;
        }
        fields.push(`${javaType(field.fieldValue)} ${javaName(field.name)}`);
      }
      records.push(
        `  public record ${name}(${fields.join(', ')}) implements ${implementsClause(impl, node)} {}`,
      );
    }
  }

  ifaces.forEach(iface => {
    const ext = implementsClause(impl, nodes[iface]);
    const fields = ifaceFields(nodes[iface]);
    ifaceSrc.push(`  public sealed interface ${iface} extends ${ext} {\n${fields}\n  }`);
  });

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
    if (isArray(fieldValue)) {
      return `List<${javaType(fieldValue.elementValue)}>`;
    }
    if ('unionElements' in fieldValue && !fieldValue.unionElements.some(isPrimitive)) {
      let unionIface = fieldValue.unionElements
        .map(e => upperCaseFirstLetter(e.name))
        .sort()
        .join('Or');
      fieldValue.unionElements.forEach(e =>
        impl.set(
          upperCaseFirstLetter(e.name),
          [unionIface].concat(impl.get(upperCaseFirstLetter(e.name)) || []),
        ),
      );
      unionIfaces.push(unionIface);
      return unionIface;
    }
    return 'Node';
  }

  function javaName(name: string) {
    if (name === 'static') {
      return 'isStatic';
    }
    return name;
  }

  function ifaceFields(node: ESTreeNode) {
    return node.fields
      .filter(f => !('unionElements' in f.fieldValue))
      .map(f => `    ${javaType(f.fieldValue)} ${javaName(f.name)}();`)
      .join('\n');
  }

  function implementsClause(impl: Map<string, string[]>, node: ESTreeNode) {
    const ifaces = [];
    if (impl.has(node.name)) {
      ifaces.push(...impl.get(node.name)!);
    } else {
      ifaces.push('Node');
    }
    return unique(ifaces).join(', ');
  }

  const estree = `${HEADER}
package org.sonar.plugins.javascript.api.estree;

import java.math.BigInteger;
import java.util.List;

/**
  This file is generated. Do not modify it manually. Look at tools/estree instead.
  
  This is !EXPERIMENTAL UNSUPPORTED INTERNAL API! It can be modified or removed without prior notice.   
*/
public class ESTree {

  private ESTree() {
    // shouldn't be instantiated, used only as a namespace
  }
  
  ${NODE_INTERFACE}  
${ifaceSrc.join('\n')}

${unique(unionIfaces)
  .map(i => `  public sealed interface ${i} extends Node {}`)
  .join('\n')}
        
${records.join('\n')}

${OPERATORS}
}

`;
  fs.writeFileSync(output, estree, 'utf-8');
}

function upperCaseFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isArray(fieldValue: NodeFieldValue): fieldValue is ArrayLikeFieldValue {
  return 'elementValue' in fieldValue;
}

function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i, self) => self.indexOf(v) === i);
}
