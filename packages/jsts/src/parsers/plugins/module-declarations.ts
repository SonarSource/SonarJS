/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

interface ModuleDeclarationInfo {
  name: string;
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
}

function scanModuleDeclarations(code: string): ModuleDeclarationInfo[] {
  const results: ModuleDeclarationInfo[] = [];
  const len = code.length;
  let i = 0;

  while (i < len) {
    const ch = code[i];

    // Skip single-line comments
    if (ch === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < len && code[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Skip block comments
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    // Skip single-quoted strings
    if (ch === "'") {
      i++;
      while (i < len && code[i] !== "'") {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    // Skip double-quoted strings
    if (ch === '"') {
      i++;
      while (i < len && code[i] !== '"') {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    // Skip template literals
    if (ch === '`') {
      i++;
      while (i < len && code[i] !== '`') {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    // Skip regex literals
    if (ch === '/') {
      // Simple heuristic: a `/` is a regex if preceded by certain tokens
      const before = code.slice(0, i).trimEnd();
      const lastChar = before[before.length - 1];
      if (
        lastChar === undefined ||
        lastChar === '=' ||
        lastChar === '(' ||
        lastChar === '[' ||
        lastChar === '!' ||
        lastChar === '&' ||
        lastChar === '|' ||
        lastChar === '?' ||
        lastChar === ':' ||
        lastChar === ',' ||
        lastChar === ';' ||
        lastChar === '{' ||
        lastChar === '}'
      ) {
        i++;
        while (i < len && code[i] !== '/') {
          if (code[i] === '\\') i++;
          if (code[i] === '[') {
            i++;
            while (i < len && code[i] !== ']') {
              if (code[i] === '\\') i++;
              i++;
            }
          }
          i++;
        }
        i++;
        continue;
      }
    }

    // Look for `module` keyword
    if (code.startsWith('module', i) && !isIdentChar(code[i - 1]) && !isIdentChar(code[i + 6])) {
      const moduleStart = i;
      let j = i + 6;

      // Skip whitespace after `module`
      while (j < len && isWhitespace(code[j])) {
        j++;
      }

      // Read identifier
      if (j < len && isIdentStart(code[j])) {
        const nameStart = j;
        while (j < len && isIdentChar(code[j])) {
          j++;
        }
        const name = code.slice(nameStart, j);

        // Skip whitespace after identifier
        while (j < len && isWhitespace(code[j])) {
          j++;
        }

        // Check for opening brace
        if (j < len && code[j] === '{') {
          const bodyStart = j + 1;
          let depth = 1;
          let k = j + 1;

          // Track nested braces to find matching closing brace
          while (k < len && depth > 0) {
            const c = code[k];

            // Skip comments inside module body
            if (c === '/' && code[k + 1] === '/') {
              k += 2;
              while (k < len && code[k] !== '\n') k++;
              continue;
            }
            if (c === '/' && code[k + 1] === '*') {
              k += 2;
              while (k < len && !(code[k] === '*' && code[k + 1] === '/')) k++;
              k += 2;
              continue;
            }

            // Skip strings inside module body
            if (c === "'" || c === '"' || c === '`') {
              const quote = c;
              k++;
              while (k < len && code[k] !== quote) {
                if (code[k] === '\\') k++;
                k++;
              }
              k++;
              continue;
            }

            if (c === '{') depth++;
            if (c === '}') depth--;
            k++;
          }

          if (depth === 0) {
            const bodyEnd = k - 1;
            const end = k;
            results.push({
              name,
              start: moduleStart,
              end,
              bodyStart,
              bodyEnd,
            });
            i = k;
            continue;
          }
        }
      }
    }

    i++;
  }

  return results;
}

function isWhitespace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

function isIdentStart(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[a-zA-Z_$]/.test(ch);
}

function isIdentChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[a-zA-Z0-9_$]/.test(ch);
}

function getLineAndColumn(code: string, pos: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < pos; i++) {
    if (code[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: pos - lastNewline - 1 };
}

function adjustLocations(
  node: any,
  lineOffset: number,
  columnOffset: number,
  bodyStartPos: number,
  code: string,
): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const child of node) {
      adjustLocations(child, lineOffset, columnOffset, bodyStartPos, code);
    }
    return;
  }

  if (typeof node.start === 'number') {
    node.start += bodyStartPos;
  }
  if (typeof node.end === 'number') {
    node.end += bodyStartPos;
  }

  if (node.loc) {
    if (node.loc.start) {
      if (node.loc.start.line === 1) {
        node.loc.start.column += columnOffset;
      }
      node.loc.start.line += lineOffset - 1;
    }
    if (node.loc.end) {
      if (node.loc.end.line === 1) {
        node.loc.end.column += columnOffset;
      }
      node.loc.end.line += lineOffset - 1;
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const val = node[key];
    if (val && typeof val === 'object') {
      adjustLocations(val, lineOffset, columnOffset, bodyStartPos, code);
    }
  }
}

function buildModuleDeclarationNode(
  name: string,
  bodyCode: string,
  startPos: number,
  endPos: number,
  bodyStartPos: number,
  code: string,
  opts: any,
  parse: Function,
): any {
  const bodyAst = safeParse(bodyCode, { ...opts, sourceType: 'module' }, parse);
  const statements = bodyAst.program ? bodyAst.program.body : bodyAst.body;

  const bodyLoc = getLineAndColumn(code, bodyStartPos);
  adjustLocations(statements, bodyLoc.line, bodyLoc.column, bodyStartPos, code);

  const startLoc = getLineAndColumn(code, startPos);
  const endLoc = getLineAndColumn(code, endPos);

  // Compute identifier positions
  let idStart = startPos + 'module'.length;
  while (idStart < code.length && isWhitespace(code[idStart])) {
    idStart++;
  }
  const idEnd = idStart + name.length;
  const idStartLoc = getLineAndColumn(code, idStart);
  const idEndLoc = getLineAndColumn(code, idEnd);

  const bodyStartLoc = getLineAndColumn(code, bodyStartPos);
  const bodyEndLoc = getLineAndColumn(code, endPos);

  return {
    type: 'ModuleDeclaration',
    start: startPos,
    end: endPos,
    loc: {
      start: { line: startLoc.line, column: startLoc.column },
      end: { line: endLoc.line, column: endLoc.column },
    },
    id: {
      type: 'Identifier',
      name,
      start: idStart,
      end: idEnd,
      loc: {
        start: { line: idStartLoc.line, column: idStartLoc.column },
        end: { line: idEndLoc.line, column: idEndLoc.column },
      },
    },
    body: {
      type: 'ModuleBlock',
      body: statements,
      start: bodyStartPos,
      end: endPos,
      loc: {
        start: { line: bodyStartLoc.line, column: bodyStartLoc.column },
        end: { line: bodyEndLoc.line, column: bodyEndLoc.column },
      },
    },
  };
}

function spliceModuleDeclarations(ast: any, moduleNodes: any[]): void {
  const body = ast.program ? ast.program.body : ast.body;
  for (let i = 0; i < body.length; i++) {
    const stmt = body[i];
    if (stmt.type === 'EmptyStatement') {
      for (const modNode of moduleNodes) {
        if (stmt.start === modNode.start) {
          body[i] = modNode;
          break;
        }
      }
    }
  }
}

/**
 * Wraps a call to @babel/parser's parse to prevent @babel/core from
 * enhancing the error with a code frame and filename prefix.
 *
 * When parserOverride is used, errors propagate through @babel/core's
 * parser catch block which adds `${filename}: ${message}\n\n${codeFrame}`
 * to the error message. In the normal flow (without parserOverride),
 * @babel/eslint-parser calls @babel/parser directly, bypassing this
 * enhancement. We replicate that behavior by catching errors and
 * rethrowing without the `loc` property that triggers the enhancement.
 */
function safeParse(code: string, opts: any, parse: Function): any {
  try {
    return parse(code, opts);
  } catch (err: any) {
    const cleanErr = new Error(err.message);
    if (err.loc) {
      (cleanErr as any).lineNumber = err.loc.line;
    }
    throw cleanErr;
  }
}

function parserOverride(code: string, opts: any, parse: Function): any {
  const declarations = scanModuleDeclarations(code);

  if (declarations.length === 0) {
    return safeParse(code, opts, parse);
  }

  // Replace each module declaration region with `;` + spaces
  let modifiedCode = code;
  for (const decl of declarations) {
    const placeholder = ';' + ' '.repeat(decl.end - decl.start - 1);
    modifiedCode = modifiedCode.slice(0, decl.start) + placeholder + modifiedCode.slice(decl.end);
  }

  const ast = safeParse(modifiedCode, opts, parse);

  const moduleNodes = declarations.map(decl => {
    const bodyCode = code.slice(decl.bodyStart, decl.bodyEnd);
    return buildModuleDeclarationNode(
      decl.name,
      bodyCode,
      decl.start,
      decl.end,
      decl.bodyStart,
      code,
      opts,
      parse,
    );
  });

  spliceModuleDeclarations(ast, moduleNodes);

  return ast;
}

export default function moduleDeclarationsPlugin() {
  return { parserOverride };
}
