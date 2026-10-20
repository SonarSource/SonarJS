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

## Verify changes

Run the CSS registry checks and the relevant CSS rule and linter tests through the
normal bridge test workflow. Changes to the integration should also preserve Java
configuration, CSS ruling results, and the bridge bundle. Repeating generation
must produce identical output.
