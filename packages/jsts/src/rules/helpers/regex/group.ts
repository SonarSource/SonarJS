/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import estree from 'estree';
import { isStringLiteral } from '../index.js';

export interface GroupReference {
  raw: string;
  value: string;
}

export function extractReferences(node: estree.Node) {
  const references: GroupReference[] = [];
  if (isStringLiteral(node)) {
    const str = node.value as string;
    const reg = /\$(\d+)|\$<([a-zA-Z]\w*)>/g;
    let match: RegExpExecArray | null;
    while ((match = reg.exec(str)) !== null) {
      const [raw, index, name] = match;
      const value = index || name;
      references.push({ raw, value });
    }
  }
  return references;
}
