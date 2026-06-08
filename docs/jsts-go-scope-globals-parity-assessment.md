# JSTS-Go Scope, Globals, and Environments Parity Assessment

Date: 2026-05-20
Branch: `feat/tsgolint-grpc-poc`

## Why This Exists

`JS-1760 - TS7 Go: honor analyze-project globals and environments for scope-sensitive migrated rules`
is narrower than "implement ESLint scope manager in Go".

This note separates:

1. what `analyze-project` `globals` and `environments` actually change in the current Node analyzer,
2. which scope-style helpers and rules are affected by that change,
3. what the current Go runtime already exposes through `typescript-go`,
4. the lowest-cost parity path before migrating more scope-sensitive rules.

Status on this branch:

- the first-step `JS-1760` design described here is now implemented
- `RuleContext` now carries `KnownGlobals`
- the Go runtime expands request `globals` and `environments`
- the narrow name-resolution helper is in place
- `S6551` now uses that helper instead of the earlier `TODO(port-scopemanager)` path

## Node Path Today

The current Node path is:

1. `packages/analysis/src/analyzeProject.ts`
   - passes `configuration.environments` and `configuration.globals` into `Linter.initialize(...)`
2. `packages/analysis/src/jsts/linter/linter.ts`
   - `setGlobals(globals, environments)`:
     - adds explicit `globals` as writable globals
     - expands `environments` through the `globals` npm package
   - `lint(...)` passes the merged map as `languageOptions.globals` to ESLint
3. ESLint scope construction then treats those names as declared globals for the file

That means the config does not only affect rule options. It changes scope resolution.

## What Changes In Node When Globals Or Environments Are Configured

Validated locally in this branch with a small ESLint probe.

### Directly affected

| Scope API / pattern                                               | Effect of configured globals / environments                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `scope.references[*].resolved`                                    | Yes. References that were unresolved become resolved global references. |
| module / global `scope.variables` and `scope.set`                 | Yes. Configured names are added as globals.                             |
| module / global `scope.through`                                   | Yes. Configured names stop appearing as unresolved globals there.       |
| helpers that walk `scope`, then `scope.upper`, looking for a name | Yes. They can now find configured globals.                              |

### Not directly affected

| Scope API / pattern                                          | Effect                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| `context.sourceCode.getDeclaredVariables(node)`              | No. This still reports declarations introduced by `node`. |
| `context.sourceCode.scopeManager.getDeclaredVariables(node)` | No. Same reason.                                          |
| local `scope.variables`                                      | No. Local declarations do not change.                     |
| `scope.childScopes` shape                                    | No. The scope tree itself does not change.                |

### Important nuance

At local function / block scope, `scope.through` still contains references that are not local to that scope.
What changes is the `resolved` field on those references.

So for local-scope users, the main semantic delta is usually:

- not "does the reference still appear?",
- but "does it resolve to a known global symbol now?".

## Important Distinction: Static `globals` Package Use vs Config-Driven Globals

These are separate concerns:

- config-driven globals / environments:
  - come from `analyze-project`
  - flow through `Linter.initialize(...)`
  - affect ESLint scope resolution
- static `globals` package imports inside rules:
  - are hard-coded built-in or environment catalogs used by a rule's own logic
  - do not depend on project configuration

Examples of the second category in the current Node codebase:

- `S2137`
- `S2424`
- `S2703`

Those rules should not be treated as evidence that the Go path already honors `analyze-project` globals / environments.

## Scope-Style Helpers In Node That Can Be Affected

The helpers most relevant to `JS-1760` are the ones that resolve names through ESLint scope data:

- `packages/analysis/src/jsts/rules/helpers/ast.ts`
  - `getVariableFromScope(...)`
  - `getVariableFromName(...)`
  - `getLhsVariable(...)`
  - `resolveFromFunctionReference(...)`
- `packages/analysis/src/jsts/rules/helpers/module.ts`
  - `getFullyQualifiedNameRaw(...)`
- `packages/analysis/src/jsts/rules/helpers/reaching-definitions.ts`
  - `getVariableFromIdentifier(...)`

Helpers that only enumerate declarations introduced by a local syntax node are not configuration-sensitive by themselves.

## Current Impact On The Go-Offloaded Rule Set

Current scope-sensitive subset within `JSTS_GO_RULES` on this branch:

- `S131`
- `S2870`
- `S2933`
- `S4123`
- `S4137`
- `S4157`
- `S4325`
- `S6544`
- `S6551`
- `S6557`
- `S6565`
- `S6571`
- `S6582`
- `S6583`
- `S6606`
- `S6671`

Observation from the current branch:

- the current offloaded set is mostly type-checker driven, not ESLint-scope-manager driven
- none of those Node rule folders currently depend on `context.sourceCode.getDeclaredVariables(...)`, `scopeManager.getDeclaredVariables(...)`, or the main scope helpers listed above
- the explicit Go-side scope gap that originally motivated `JS-1760` was:
  - `server-go/sonar-server/internal/rules/no_base_to_string/no_base_to_string.go`
  - distinguishing the built-in global `String` from a shadowed local `String`
- that gap is now closed on this branch through the narrow `ResolveValueName(...)` helper plus configured known globals

So `JS-1760` is now implemented as groundwork for the current offloaded set.
It still matters more as a prerequisite for future scope-sensitive migrations than as a blocker for the current routed rules.

Likely future rule pressure points include:

- remaining `typescript-eslint` wrappers that already use scope APIs locally, such as `S1788` and `S4138`
- any future migration of rules whose Node behavior depends on:
  - `scope.references`
  - `scope.through`
  - module / global `scope.variables`
  - upward name lookup through scope chains

## What Go Exposes Today

The current Go rule runtime does not expose an ESLint-style scope manager.

`server-go/sonar-server/internal/rule/rule.go` currently gives rules:

- `Program`
- `TypeChecker`
- `SourceFile`
- `KnownGlobals`
- reporting callbacks

No current equivalent exists in `RuleContext` for:

- `getScope(node)`
- `scope.references`
- `scope.through`
- `scope.childScopes`
- `getDeclaredVariables(node)`

However, `typescript-go` already exposes useful primitives that are enough for a narrower first step:

- `TypeChecker.ResolveName(name, location, meaning, excludeGlobals)`
- `TypeChecker.GetSymbolAtLocation(node)`
- `TypeChecker.GetSymbolsInScope(location, meaning)`
- `ast.GetLocals(container)`
- `ast.GetEnclosingBlockScopeContainer(node)`

That means Go is not starting from nothing.
It already has name-resolution and local-symbol primitives from the TypeScript binder / checker.

## Implemented First Step

### 1. Add a narrow Go-side scope helper layer first

Do not start with a full ESLint scope graph.

Start with helpers that answer the subset of questions the migrated rules actually need:

- "does this identifier resolve to a local symbol?"
- "does it resolve to a global / built-in symbol?"
- "is this name only known because of `analyze-project` configured globals / environments?"
- "what locals are declared in this container?"

That layer should sit in Sonar-owned Go code, not in `typescript-go`.

### 2. Thread config-expanded known globals into Go rule execution

The branch now threads a config-derived known-global set into the Go rule runtime.

That set should:

- merge explicit `analyze-project` `globals`
- expand `analyze-project` `environments` using data generated from the Node `globals` package
- be available from `RuleContext` or from a helper reachable from `RuleContext`

Then Go scope helpers can merge:

- local TS resolution from `ResolveName(..., excludeGlobals=true)`
- builtin / library globals from the checker
- config-known globals from `analyze-project`

without needing to mutate the TypeScript program.

### 3. Avoid naive synthetic `.d.ts` injection as the first design

A tempting shortcut is to inject configured globals as synthetic ambient declarations into every Go program.

That is risky:

- browser environments overlap heavily with `lib.dom`
- names such as `alert` already exist in DOM libs
- naive `declare var alert: any` injection produces duplicate identifier errors

Synthetic declarations may still be useful later for specific cases, but they are not the safest first step for `JS-1760`.

### 4. Only build a reference graph if future migrations truly need it

If future rule migrations need parity for:

- `scope.references`
- `scope.through`
- `scope.childScopes`
- `variableScope`

then Go will need a file-local reference collector / scope graph on top of TS AST traversal.

At that point the closer semantic target is not plain `eslint-scope` alone.
For TypeScript rules, the real behavioral target is the `typescript-eslint` scope-manager model layered on top of TypeScript-aware parsing.

## Practical Next Step

Implemented on this branch:

1. config-expanded known globals / environments in the Go runtime,
2. a narrow scope helper API over `ResolveName(...)` and `GetLocals(...)`,
3. first use of that API on `S6551` for "local vs global vs configured-global" semantics.

The remaining future work here is only needed if later migrations require a fuller scope/reference model than this narrow helper layer provides.
