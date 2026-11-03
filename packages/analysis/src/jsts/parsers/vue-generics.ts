/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import ts from 'typescript';
import type { AST } from 'vue-eslint-parser';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RequiredParserServices } from '../rules/helpers/parser-services.js';
import { parsersMap } from './eslint.js';

type ScriptResult = ReturnType<typeof parsersMap.typescript.parseForESLint>;
type VueResult = ReturnType<typeof parsersMap.vuejs.parseForESLint>;
type Range = { start: number; end: number };
type Segment = Range & { generated: number };
type Edit = Range & { text: string; mapped?: boolean };

/** Only text and offsets are cached, never the preparation pass's syntax AST. */
export interface VueGenericProjection {
  readonly code: string;
  readonly segments: readonly Segment[];
  readonly removed: readonly Range[];
  readonly starts: ReadonlyMap<number, number>;
}

/**
 * Vue's public AST retains the generic declaration, while its inner parser sees
 * aliases of the constraints. Replace only those synthetic aliases and wrap the
 * setup statements in a genuine generic function. Normal script code stays outside.
 * undefined means no generics; null means the script must remain syntax-only.
 */
export function prepareVueGenerics(
  result: VueResult,
  source: ts.SourceFile,
): VueGenericProjection | null | undefined {
  const document = result.services?.getDocumentFragment();
  const generic = findGeneric(document);
  if (!generic) {
    return undefined;
  }
  const realAliases = new Set<ts.Node>();
  const services = result.services as unknown as ScriptResult['services'];
  visitESTree(result.ast as TSESTree.Node, result.visitorKeys ?? {}, node => {
    if (node.type === 'TSTypeAliasDeclaration') {
      realAliases.add(services.esTreeNodeToTSNodeMap.get(node));
    }
  });
  const names = new Set(generic.params.map(parameter => parameter.name.name));
  const aliases: ts.TypeAliasDeclaration[] = [];
  visitTS(source, node => {
    if (ts.isTypeAliasDeclaration(node) && names.has(node.name.text) && !realAliases.has(node)) {
      aliases.push(node);
    }
  });
  const container = aliases[0]?.parent;
  if (
    aliases.length !== generic.params.length ||
    !container ||
    !(ts.isSourceFile(container) || ts.isBlock(container)) ||
    !aliases.every(alias => alias.parent === container)
  ) {
    return null;
  }
  return projectSetup(source, container, aliases, generic.rawParams.join(', '));
}

function findGeneric(document: AST.VDocumentFragment | null | undefined) {
  for (const child of document?.children ?? []) {
    if (child.type !== 'VElement' || child.name !== 'script') {
      continue;
    }
    for (const attribute of child.startTag.attributes) {
      if (attribute.directive && attribute.value?.expression?.type === 'VGenericExpression') {
        return attribute.value.expression;
      }
    }
  }
  return undefined;
}

function projectSetup(
  source: ts.SourceFile,
  container: ts.SourceFile | ts.Block,
  aliases: ts.TypeAliasDeclaration[],
  parameters: string,
): VueGenericProjection | null {
  const prepared = prepareSetupEdits(source, container, aliases);
  if (!prepared) {
    return null;
  }
  const { edits, imports, removed, starts } = prepared;
  const standalone = ts.isSourceFile(container);
  const insertion = standalone ? 0 : container.getStart(source);
  const async = setupNeedsAsync(container) ? 'async ' : '';
  edits.push({
    start: insertion,
    end: insertion,
    // An arrow preserves lexical this/arguments; void avoids a synthetic binding.
    // The trailing comma disambiguates an unconstrained type parameter from JSX.
    text: `void (${async}<${parameters}\n,>() =>${standalone ? '{\n' : ''}`,
  });
  if (!standalone) {
    edits.push({ start: container.end, end: container.end, text: ');\n' });
  }
  const rendered = renderProjection(source.text, edits, imports);
  return (
    rendered && { ...rendered, code: rendered.code + (standalone ? '\n});' : ''), removed, starts }
  );
}

function setupNeedsAsync(container: ts.SourceFile | ts.Block) {
  let needsAsync = false;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionLike(node)) {
      return;
    }
    if (
      ts.isAwaitExpression(node) ||
      (ts.isForOfStatement(node) && node.awaitModifier) ||
      (ts.isVariableDeclarationList(node) &&
        (node.flags & ts.NodeFlags.AwaitUsing) === ts.NodeFlags.AwaitUsing)
    ) {
      needsAsync = true;
    } else {
      ts.forEachChild(node, visit);
    }
  };
  visit(container);
  return needsAsync;
}

function prepareSetupEdits(
  source: ts.SourceFile,
  container: ts.SourceFile | ts.Block,
  aliases: ts.TypeAliasDeclaration[],
) {
  const edits: Edit[] = [];
  const imports: Range[] = [];
  const starts = new Map<number, number>();
  const removed = aliases.map(alias => ({ start: alias.getStart(source), end: alias.end }));
  for (const range of removed) {
    edits.push({ ...range, text: blank(source.text.slice(range.start, range.end)) });
  }
  for (const statement of container.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    const exported = modifiers?.find(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
      const range = { start: statement.getFullStart(), end: statement.end };
      imports.push(range);
      edits.push({ ...range, text: blank(source.text.slice(range.start, range.end)) });
    } else if (modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) {
      // Ambient bindings can depend on the generic parameter. Keep them local and
      // definitely assigned, without putting an illegal `declare` in the function.
      if (!ts.isVariableStatement(statement)) {
        return null;
      }
      const ambient = prepareAmbientBinding(source, statement);
      if (!ambient) {
        return null;
      }
      edits.push(...ambient.edits);
      starts.set(statement.getStart(source), statement.declarationList.getStart(source));
    } else if (
      exported &&
      (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) &&
      !modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      const keyword = statement
        .getChildren(source)
        .find(
          child =>
            child.kind === ts.SyntaxKind.InterfaceKeyword ||
            child.kind === ts.SyntaxKind.TypeKeyword,
        );
      if (!keyword) {
        return null;
      }
      // Vue permits type-only exports. Remove only the modifier inside the function
      // and map the declaration's former export start to its declaration keyword.
      edits.push({
        start: exported.getStart(source),
        end: exported.end,
        text: blank(exported.getText(source)),
      });
      starts.set(statement.getStart(source), keyword.getStart(source));
    } else if (
      ts.isModuleDeclaration(statement) ||
      ts.isExportDeclaration(statement) ||
      ts.isExportAssignment(statement) ||
      exported
    ) {
      // Namespaces cannot move inside a function. Value/default exports in setup
      // are rejected by Vue's compiler; don't invent semantics for these forms.
      return null;
    }
  }
  return { edits, imports, starts, removed };
}

function prepareAmbientBinding(source: ts.SourceFile, statement: ts.VariableStatement) {
  const list = statement.declarationList;
  if (
    list.declarations.some(
      declaration =>
        !ts.isIdentifier(declaration.name) || !declaration.type || declaration.initializer,
    )
  ) {
    return null;
  }
  const start = statement.getStart(source);
  const keywordStart = list.getStart(source);
  // var and let have the same width. Pad let to preserve the mapped keyword span.
  const keywordLength = list.flags & ts.NodeFlags.Const ? 'const'.length : 'var'.length;
  const edits: Edit[] = [
    { start, end: keywordStart, text: '' },
    {
      start: keywordStart,
      end: keywordStart + keywordLength,
      text: 'let'.padEnd(keywordLength),
      mapped: true,
    },
    ...list.declarations.map(declaration => ({
      start: declaration.name.end,
      end: declaration.name.end,
      text: '!',
    })),
  ];
  return { edits };
}

/** Copy ranges retain mappings; inserted/blanked text deliberately has none. */
function renderProjection(text: string, edits: Edit[], imports: Range[]) {
  edits.sort((a, b) => a.start - b.start || a.end - b.end);
  const segments: Segment[] = [];
  let code = '';
  const copy = (start: number, end: number) => {
    if (start < end) {
      segments.push({ start, end, generated: code.length });
      code += text.slice(start, end);
    }
  };
  for (const range of imports) {
    copy(range.start, range.end);
    code += '\n';
  }
  let offset = 0;
  for (const edit of edits) {
    if (edit.start < offset) {
      return null;
    }
    copy(offset, edit.start);
    // The replacement keyword still supplies the VariableStatement's start.
    if (edit.mapped) {
      segments.push({ start: edit.start, end: edit.end, generated: code.length });
    }
    code += edit.text;
    offset = edit.end;
  }
  copy(offset, text.length);
  return { code, segments };
}

function blank(text: string) {
  return text.replace(/[^\r\n]/g, ' ');
}

/**
 * Rebind Vue's unchanged ESTree nodes to the semantic SourceFile. Vue will then
 * restore ESTree locations as usual. Fail closed if any surviving node is missing.
 */
export function applyVueGenericServices(
  parsed: ScriptResult,
  projection: VueGenericProjection,
  program: ts.Program,
  source: ts.SourceFile,
): ScriptResult {
  const previous = parsed.services;
  const syntaxSource = previous.esTreeNodeToTSNodeMap.get(parsed.ast);
  if (!syntaxSource) {
    return parsed;
  }
  const indexed = new Map<string, ts.Node>();
  visitTS(source, node => indexed.set(nodeKey(node.kind, node.getStart(source), node.end), node));
  const forward = new WeakMap<TSESTree.Node, ts.Node>();
  const reverse = new WeakMap<ts.Node, TSESTree.Node>();
  let complete = true;
  visitESTree(parsed.ast, parsed.visitorKeys, node => {
    const old = previous.esTreeNodeToTSNodeMap.get(node);
    // ESTree-only containers (for example TSTypeAnnotation) have no TS node
    // in the parser's original maps either.
    if (!old) {
      return;
    }
    if (old.getSourceFile() !== syntaxSource) {
      complete = false;
      return;
    }
    const start = old.getStart(syntaxSource);
    if (projection.removed.some(range => start >= range.start && old.end <= range.end)) {
      return;
    }
    const mappedStart = mapOffset(projection, projection.starts.get(start) ?? start, false);
    const mappedEnd = mapOffset(projection, old.end, true);
    const current = ts.isSourceFile(old)
      ? source
      : indexed.get(nodeKey(old.kind, mappedStart, mappedEnd));
    if (!current) {
      complete = false;
      return;
    }
    forward.set(node, current);
    if (previous.tsNodeToESTreeNodeMap.get(old) === node) {
      reverse.set(current, node);
    }
  });
  if (!complete) {
    return parsed;
  }
  const checker = program.getTypeChecker();
  // ParserWeakMap.get is non-optional by contract. Every previously mapped,
  // surviving node was checked above; keep this assertion at the API boundary.
  const esTreeNodeToTSNodeMap = forward as RequiredParserServices['esTreeNodeToTSNodeMap'];
  const options = program.getCompilerOptions();
  const services: RequiredParserServices = {
    ...previous,
    program,
    emitDecoratorMetadata: !!options.emitDecoratorMetadata,
    experimentalDecorators: !!options.experimentalDecorators,
    isolatedDeclarations: !!options.isolatedDeclarations,
    esTreeNodeToTSNodeMap,
    tsNodeToESTreeNodeMap: reverse as RequiredParserServices['tsNodeToESTreeNodeMap'],
    getTypeAtLocation: node => checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(node)),
    getSymbolAtLocation: node => checker.getSymbolAtLocation(esTreeNodeToTSNodeMap.get(node)),
    getContextualType: node =>
      checker.getContextualType(esTreeNodeToTSNodeMap.get(node) as ts.Expression),
    getResolvedSignature: node => checker.getResolvedSignature(esTreeNodeToTSNodeMap.get(node)),
    getTypeFromTypeNode: node =>
      checker.getTypeFromTypeNode(esTreeNodeToTSNodeMap.get(node) as ts.TypeNode),
    getTypeOfSymbolAtLocation: (symbol, node) =>
      checker.getTypeOfSymbolAtLocation(symbol, esTreeNodeToTSNodeMap.get(node)),
  };
  return { ...parsed, services };
}

function mapOffset(projection: VueGenericProjection, offset: number, end: boolean) {
  const segment = projection.segments.find(segment =>
    end
      ? segment.start < offset && offset <= segment.end
      : segment.start <= offset && offset < segment.end,
  );
  return segment ? segment.generated + offset - segment.start : undefined;
}

function nodeKey(kind: ts.SyntaxKind, start: number | undefined, end: number | undefined) {
  return `${kind}:${start}:${end}`;
}

function visitTS(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, child => visitTS(child, visit));
}

function visitESTree(
  node: TSESTree.Node,
  keys: { readonly [type: string]: readonly string[] | undefined },
  visit: (node: TSESTree.Node) => void,
) {
  visit(node);
  for (const key of keys[node.type] ?? []) {
    const value = (node as unknown as Record<string, TSESTree.Node | TSESTree.Node[]>)[key];
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child) {
        visitESTree(child, keys, visit);
      }
    }
  }
}
