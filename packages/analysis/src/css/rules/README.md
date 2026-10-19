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

Run `npm run test:rule-tools` for scaffolding and generation tests. Run the relevant
CSS rule and linter tests through the normal bridge test workflow. Changes to the
integration should also preserve Java configuration, CSS ruling results, and the
bridge bundle. Repeating generation must produce identical output.
