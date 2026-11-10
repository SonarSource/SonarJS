# CSS rules

Each Sonar rule has an `Sxxxx` folder. Its `meta.ts` describes how the rule integrates
with Stylelint. Keep detection logic in `rule.ts` and expose local plugins through
`index.ts`.

## Create a rule

Run `npm run new-rule` and select **CSS (Stylelint)**. Select an implementation:

- **Original** creates metadata, a local plugin, an entry point, and a test template.
- **Decorated** creates the same files and uses the existing `createDecoratedRule`
  helper to filter or rewrite reports from a Stylelint core rule.
- **External** creates metadata and a test template. Stylelint or the registered
  `@stylistic/stylelint-plugin` supplies the implementation, so no wrapper is needed.

The command validates the installed upstream rule names, rejects duplicate keys,
and updates the generated indexes. It does not overwrite an existing rule folder.
Replace the sample detection logic and messages, then enable and complete the
generated tests. Add valid cases, invalid cases, and relevant regression cases.

After the CSS RSPEC data is available, run:

```sh
npm run generate-meta
npm run generate-java-rule-classes
```

The first command updates both JS/TS and CSS indexes. The second uses the existing
Java generator to create the CSS checks, parameter handling, tests, and registry.
Titles, severity, and quality profiles continue to come from RSPEC.

## Rule metadata

Developers maintain each `meta.ts`; the build does not generate it. The properties
control scaffolding, validation, plugin registration, and parameter configuration.
They do not contain the rule's detection logic.

For example, a decorated rule defines its local and upstream keys together:

```typescript
import type { CssRuleDefinition } from '../types.js';

export const meta = {
  implementation: 'decorated',
  bindings: [
    {
      stylelintKey: 'sonar/declaration-no-important',
      upstreamRule: 'declaration-no-important',
    },
  ],
} satisfies CssRuleDefinition;
```

The folder supplies the Sonar key; do not repeat it in metadata. Import identifiers
from `meta.ts` in the implementation and its tests:

```typescript
import { meta } from './meta.js';

const { stylelintKey, upstreamRule } = meta.bindings[0];
```

An original rule uses `implementation: 'original'` and one binding with a
`stylelintKey` that starts with `sonar/`. A decorated rule also specifies its
`upstreamRule`. An external rule uses `implementation: 'external'` and
`externalPlugin: 'stylelint'` or `'@stylistic/stylelint-plugin'`.

External rules can have several bindings. For example, S1874 enables three
Stylelint rules. Keep all bindings in the same Sonar rule folder. S2260 is a
special parsing-error integration handled by the Java generator, not a plugin.

### Definition properties

| Property         | Purpose                                                                                                                                             | Consumer                                                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implementation` | Select `original`, `decorated`, or `external`. Original and decorated rules provide a local plugin. External rules use a provider's implementation. | `createNewCssRule()` selects the starter files and template. `validateCssRulesMetadata()` checks the required fields and binding count. `updateCssRuleIndexes()` includes only original and decorated plugins in `rules.ts`. |
| `bindings`       | Map one Sonar rule to its Stylelint checks. Local rules require exactly one binding; external rules can have several.                               | `metadata.ts` converts each binding into a flat `cssRulesMeta` entry for Java generation and ruling. Registry tests check the mappings.                                                                                      |
| `externalPlugin` | Identify the provider: `stylelint` or `@stylistic/stylelint-plugin`. Required only for external rules.                                              | The validator checks that the selected provider supplies each binding. This field does not load a plugin; `createStylelintConfig()` already registers the supported plugins.                                                 |

`implementation` has a functional role in CSS registration. It is not only a
documentation label. The resulting plugin path is:

```text
meta.implementation (original or decorated)
  -> updateCssRuleIndexes(): write an export to rules.ts
  -> rules/index.ts: collect exports into sonarRules
  -> createStylelintConfig(): register sonarRules with Stylelint
```

External rules have no local export in `rules.ts`. All implementation types have
a metadata export in `metas.ts`. Registration makes a plugin available; the active
rule configuration determines which checks run.

### Binding properties

| Property       | Purpose                                                                                                                                  | Consumer                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stylelintKey` | Identify the check in Stylelint configuration and reports. Local keys start with `sonar/`. External keys match the provider's rule name. | Local implementations read this key when they create a plugin. The adapter builds the reverse Sonar key map. Java generation and ruling use it to configure checks.   |
| `upstreamRule` | Identify the Stylelint core rule that a decorated rule wraps. Required only for decorated rules.                                         | The validator checks that the core rule exists. The local implementation passes the key to `createDecoratedRule()`.                                                   |
| `cssOnly`      | Set `true` to restrict the binding to CSS files and CSS blocks in HTML/Vue. Omit it or set `false` to retain normal syntax routing.      | The adapter derives `cssOnlyRuleKeys`. `createStylelintConfig()` and the embedded warning filter use that set.                                                        |
| `listParam`    | Define configurable string-list parameters for this binding. Do not combine it with `booleanParam`.                                      | Java generation creates rule properties and converts comma-separated values into Stylelint option arrays. Ruling uses the defaults.                                   |
| `booleanParam` | Define one boolean parameter that supplies fixed Stylelint options when enabled. Do not combine it with `listParam`.                     | Java generation creates the boolean rule property and conditional options. Ruling uses the default. A false value omits these options; it does not disable the check. |

Set `cssOnly: true` on a binding if it must skip preprocessor syntax. This limits
the rule to CSS files and CSS style blocks in HTML/Vue. The default is to retain
the normal CSS and preprocessor routing. Both linter configuration and embedded
warning filtering use the set derived from this field.

Bindings can define `listParam` or `booleanParam` with the existing Java generator
types. Preserve the distinction between the public Sonar parameter name (`sqKey`),
the Java field (`javaField`), and the upstream option name (`stylelintOptionKey`).
See S4654 for list parameters with different public and upstream names, and S4656
for a boolean parameter. Parameter names and Java fields must be unique within a
Sonar rule, including rules with several bindings.

### Parameter properties

These fields belong to each `listParam` entry or to `booleanParam`:

| Property             | Purpose                                                                                                                                  | Consumer                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `sqKey`              | Name the public Sonar rule parameter. This is a parameter key, not the rule's `Sxxxx` key.                                               | Java generation writes the `@RuleProperty` key.                                                |
| `javaField`          | Name the generated Java field that stores the parameter value.                                                                           | Java generation creates the field and reads it when it builds Stylelint options.               |
| `description`        | Describe the parameter for users.                                                                                                        | Java generation writes the `@RuleProperty` description.                                        |
| `default`            | Set the comma-separated string default for a list parameter, or the boolean default for a boolean parameter.                             | Java generation writes the property default. Ruling builds default configurations from it.     |
| `stylelintOptionKey` | Name the Stylelint secondary option for a list parameter. It can differ from `sqKey` and `javaField`.                                    | Java generation serializes the option under this key. Ruling uses the same key.                |
| `onTrue`             | List the fixed options to supply when a boolean parameter is true. Each entry has a `stylelintOptionKey` and a string array of `values`. | Java generation builds the enabled options. Ruling uses them when the boolean default is true. |

The generator validates parameter and Java field names across all bindings of a
Sonar rule. It also rejects duplicate option keys within a binding.

Shared defaults for CSS tool directives live in `helpers/tool-directives.ts`.
Import them from that module so per-rule metadata does not depend on an aggregate
index.

## Registration and generation

`tools/generate-css-rule-indexes.ts` discovers rule folders and reads their
metadata directly. It writes two files with static imports:

- `metas.ts` exports metadata for all CSS rules.
- `rules.ts` exports local original and decorated plugins through their `index.ts`.

Do not edit these files manually. Run `npm run generate-meta` after adding a rule
or changing its implementation kind. Static imports keep the bundled analyzer
independent of runtime filesystem discovery.

`index.ts` collects the generated plugin exports. `metadata.ts` derives the flat
`cssRulesMeta` compatibility adapter, the reverse key map, and CSS-only keys. The
Java generator and ruling tools use this adapter. Rule-data deployment reads rule
folders directly, so `npm run rspec:refresh` can run before index generation. None
of these consumers needs a separate manual registration step.

The generator validates duplicate keys, upstream providers and rule names,
parameter conflicts, and the presence of local implementation files. Registry
tests also verify that local plugin names match their metadata. Metadata imports
do not load local plugin implementations.

## Next steps for the CSS analyzer

This section records deferred proposals for the CSS analyzer as CSS-family rule
coverage grows. They are not part of the current architecture or requirements for
adding new rules.

### Shared parsing services

When adding CSS rules, check whether they repeat parsing or interpretation already
performed by another rule or by syntax highlighting. A future per-file service
could expose cached parsing entry points for `postcss-value-parser`,
`postcss-selector-parser`, and `css-tree`. It would return the libraries' existing
ASTs, rather than wrap every method they expose. Rules could still call methods
such as `ast.walk()` directly.

**Decision:** keep the current direct imports for now. Repeated work exists, but
we have not demonstrated an end-to-end performance gain that justifies a shared
abstraction. Prefer measured local optimizations until more consumers need the
same data. This proposal does not require a listener dispatcher or changes to
Stylelint's per-rule traversal model.

#### Candidates to revisit

- **S9440:** repeated interpretation of animation/transition values and spatial
  values. Caching derived results may save more work than caching parsing alone.
  Resolved selectors already have a local cache during collection.
- **S9424 and S9449:** overlapping `css-tree` value parsing for transition
  declarations. S9424 already caches successful validations by lexer and modifies
  parsed identifiers, so sharing its AST requires care.
- **S7923, S7924, S7925 and S9441:** value parsing can overlap with other rules or
  highlighting, depending on the declarations and enabled rules.
- **Syntax highlighting:** can reuse value trees requested during linting. Cache
  lifetime would therefore need to extend through highlighting.

An exploratory probe on 17 local CSS fixtures reduced `postcss-value-parser`
executions from 103 to 42 with a temporary per-file text cache, preserving findings
and highlighting in that sample. Deprecated S5362 was excluded. These counts
include repeated values across declarations and intermediate fragments; a cache
keyed only by declaration nodes would not necessarily achieve the same reduction.
This was a small fixture experiment, not a representative performance benchmark
or evidence of a 59% reduction in analysis time.

#### Design and validation considerations

If revisited, create services lazily for each file or embedded stylesheet and
share the instance with participating rules and highlighting. Provide access
through our integration layer; avoid a global mutable service instance.

Cache keys must distinguish the parser, input text and relevant options. Preserve
the distinction between raw, normalized and comment-preserving values. Cached
ASTs must be treated as read-only; consumers that mutate trees need an isolated
copy or a separately cached derived result. Node-based caches must account for
changes to node content. Bound memory and release caches after analysis.

Before adopting the service, benchmark real stylesheets with the actual quality
profile. Compare end-to-end analysis time and peak memory, check findings and
highlighting parity, and account for existing caches and lookup/cloning costs.
Upstream Stylelint rules will retain their own parsing unless explicitly adapted.
Introduce only the shared operations that demonstrate a benefit.

### Retain the Sass AST for syntax-specific rules

For `.sass` files, `sass-parser` already builds a Sass AST with expression trees.
Our adapter uses statement structure and source locations to build a separate
PostCSS tree for Stylelint, but does not retain a queryable association with the
original nodes. A future step is to retain the Sass AST and expose selected
information through per-stylesheet analysis services when a concrete rule needs
it.

Suggested architecture (not implemented):

```text
                  Parse Sass once
                         |
                         v
                  Upstream Sass AST
                         |
                  Our PostCSS builder
                         |
             +-----------+------------+
             |                        |
             v                        v
      PostCSS tree              Side mapping
      used by Stylelint         to original Sass nodes
             |                        ^
             v                        |
      Stylelint rules ----> Analysis services
                              query Sass information
```

We would own a side mapping from generated PostCSS nodes to their original Sass
nodes, recorded during conversion. The mapping must allow missing or multiple
counterparts because conversion can split, synthesize or flatten nodes. Rules
could query the Sass expression for a declaration without parsing the file again.
In the installed API, declaration values are available through `.expression` and
node kinds through `.sassType`.

Keep the existing PostCSS tree for compatibility with current rules. Treat the
retained Sass tree as read-only and translate expression ranges through
`SassSource` before reporting against original source, including dedented embedded
styles. Ordinary PostCSS traversal does not visit expression children; expression
walking would need a tested adapter around the experimental upstream API. Do not
rely on upstream selector ASTs while our keyframe workaround disables their
parsing.

This applies initially to `.sass`: `.scss` still uses `postcss-scss`, so equivalent
SCSS access requires a separate parser integration decision. The available data
describes syntax, not resolved variables, expanded mixins or computed values.
Validate node associations, reporting locations and unsupported cases, and measure
the memory cost of retaining the tree before adopting this proposal. Keep it
separate from the performance case for shared parsing caches.

## Verify changes

Run the CSS registry checks and the relevant CSS rule and linter tests through the
normal bridge test workflow. Changes to the integration should also preserve Java
configuration, CSS ruling results, and the bridge bundle. Repeating generation
must produce identical output.
