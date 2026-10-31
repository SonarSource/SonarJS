import { SyntaxKind } from 'typescript-native/ast';
import { createNativeChecker } from './nativeCheckerAdapter.ts';
import { createNativeNodeAdapter, toClassicDiagnostic } from './nativeNodeAdapter.ts';
import { createNativeProgram } from './nativeProgramAdapter.ts';
import { createNativeTypeAdapter } from './nativeTypeAdapter.ts';

const typedKinds = new Set(
  Object.entries(SyntaxKind)
    .filter(
      ([name, value]) =>
        typeof value === 'number' &&
        /Expression$|Literal$|^Identifier$|^FunctionDeclaration$|^(?:False|Null|Super|This|True)Keyword$/.test(
          name,
        ),
    )
    .map(([, value]) => value),
);
const untypedParents = new Set([
  SyntaxKind.ExportSpecifier,
  SyntaxKind.ImportClause,
  SyntaxKind.ImportSpecifier,
  SyntaxKind.NamespaceExport,
  SyntaxKind.NamespaceImport,
  SyntaxKind.QualifiedName,
  SyntaxKind.TypeReference,
]);
const typedNames = new Set([
  SyntaxKind.ShorthandPropertyAssignment,
  SyntaxKind.VariableDeclaration,
]);
const callKinds = new Set([SyntaxKind.CallExpression, SyntaxKind.NewExpression]);

// These are only batch candidates. The checker schedules IPC lazily when rules
// actually ask for types; parser traversal itself must not trigger type queries.
function collectCandidates(source, wrap) {
  const calls = [],
    contextual = [],
    typed = [];
  const visit = node => {
    const parent = node.parent;
    if (callKinds.has(node.kind)) calls.push(wrap(node));
    if (
      (callKinds.has(parent?.kind) && parent.arguments?.includes(node)) ||
      [
        SyntaxKind.PropertyAssignment,
        SyntaxKind.ReturnStatement,
        SyntaxKind.ShorthandPropertyAssignment,
      ].includes(parent?.kind)
    )
      contextual.push(wrap(node));
    const needsType =
      node.kind === SyntaxKind.Identifier
        ? !untypedParents.has(parent?.kind) &&
          (parent?.name !== node || typedNames.has(parent?.kind))
        : typedKinds.has(node.kind);
    if (needsType) typed.push(wrap(node));
    node.forEachChild(visit);
  };
  source.forEachChild(visit);
  return { calls, contextual, typed };
}

/** Compiler-side TS6-shaped view. No parser or ESTree knowledge belongs here. */
export function createCompatibleProgram(api, project, onError = () => {}) {
  const checker = new Proxy(project.checker, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== 'function') return value;
      return new Proxy(value, {
        apply(method, receiver, args) {
          try {
            return Reflect.apply(method, receiver, args);
          } catch (error) {
            onError(String(property), error);
            throw error;
          }
        },
        get(method, key) {
          if (key !== 'gen') return Reflect.get(method, key);
          return function* (...args) {
            try {
              return yield* method.gen(...args);
            } catch (error) {
              onError(String(property), error);
              throw error;
            }
          };
        },
      });
    },
  });
  const context = new Proxy(project, {
    get(target, property) {
      return property === 'checker' ? checker : Reflect.get(target, property, target);
    },
  });
  // Views, diagnostics and memoized semantic answers are scoped to this snapshot.
  // Updating an IDE session must not reuse answers from the previous checker.
  const nodes = createNativeNodeAdapter({
    getSyntacticDiagnostics: file => project.program.getSyntacticDiagnostics(file),
  });
  const adapted = createNativeChecker({
    api,
    checker,
    nodeAdapter: nodes,
    typeAdapter: createNativeTypeAdapter({ checker, nodeAdapter: nodes, project: context }),
  });
  const program = createNativeProgram({
    checker: adapted.checker,
    nodeAdapter: nodes,
    project: context,
  });
  const getSourceFile = program.getSourceFile;
  const prepared = new WeakSet();
  program.getSourceFile = file => {
    const source = getSourceFile(file);
    if (source && !prepared.has(source)) {
      prepared.add(source);
      adapted.prefetch(collectCandidates(nodes.unwrapNode(source), node => nodes.wrapNode(node)));
    }
    return source;
  };
  program.getSourceFileByPath = program.getSourceFile;
  // SonarJS S1874 uses this classic internal checker member.
  adapted.checker.getSuggestionDiagnostics = source =>
    project.program
      .getSuggestionDiagnostics(source.fileName)
      .map(diagnostic => toClassicDiagnostic(diagnostic, file => file && getSourceFile(file)));
  for (const [member, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(adapted.checker),
  )) {
    if (typeof descriptor.value !== 'function') continue;
    const original = descriptor.value;
    adapted.checker[member] = function (...args) {
      try {
        return Reflect.apply(original, this, args);
      } catch (error) {
        onError(`facade:${member}`, error);
        throw error;
      }
    };
  }
  return program;
}
