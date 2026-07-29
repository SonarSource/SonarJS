# S6747 JSX property exception survey

Goal: identify popular React ecosystem libraries that make otherwise invalid JSX properties valid, then decide whether S6747 can safely detect them by dependency, runtime import, or another narrow signal.

## Core rule for candidates

Add an S6747 exception only when the library makes the prop valid on intrinsic JSX elements such as `<div css={...}>`, `<div sx={...}>`, or custom host elements that the wrapped upstream rule would otherwise report.

Do not add broad exceptions for libraries whose props are valid only on their own React components, such as `<Box sx={...}>`, unless the false positive also affects intrinsic JSX or custom elements seen by S6747.

Prefer small, explicit prop exceptions. A candidate that requires a large, generated, version-sensitive, or open-ended list of JSX attributes is a red flag. In that case, exclude the library unless the team explicitly accepts the maintenance cost.

## Current S6747 implementation

Implementation entry point: `packages/analysis/src/jsts/rules/S6747/false-positives/index.ts`.

The rule currently builds a list of props to ignore for the wrapped `react/no-unknown-property` rule. It uses three activation models:

- project dependency only;
- project dependency or runtime import in the current file;
- runtime import in the current file only.

| Library / framework | What it does                                                                         | Prop(s) ignored | Detection model              | Test coverage                                                              |
| ------------------- | ------------------------------------------------------------------------------------ | --------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `next`              | React framework that commonly includes styled-jsx support.                           | `jsx`, `global` | dependency                   | `nextjs-project/unit.test.ts`                                              |
| `styled-jsx`        | Scoped CSS-in-JS library whose `<style>` elements use `jsx` and `global` attributes. | `jsx`, `global` | dependency                   | `styled-jsx-project/unit.test.ts`                                          |
| `@compiled/react`   | Atlassian compile-time CSS-in-JS library that supports a JSX `css` prop.             | `css`           | dependency or runtime import | `compiled-project/unit.test.ts`, `non-react-project/unit.test.ts`          |
| `@emotion/react`    | CSS-in-JS library that supports object/template styles through the JSX `css` prop.   | `css`           | dependency or runtime import | `emotion-project/unit.test.ts`, `non-react-project/unit.test.ts`           |
| `styled-components` | CSS-in-JS library that can consume a JSX `css` prop for inline component styling.    | `css`           | dependency or runtime import | `styled-components-project/unit.test.ts`, `non-react-project/unit.test.ts` |
| `theme-ui`          | Theme-aware styling library that exposes the `sx` prop.                              | `sx`            | dependency or runtime import | `theme-ui-project/unit.test.ts`, `non-react-project/unit.test.ts`          |
| `@theme-ui/core`    | Core Theme UI package that also exposes the `sx` prop.                               | `sx`            | dependency or runtime import | `theme-ui-core-project/unit.test.ts`, `non-react-project/unit.test.ts`     |
| `@stylexjs/stylex`  | Meta's compile-time styling library whose Babel plugin can transform an `sx` prop.   | `sx`            | dependency or runtime import | `stylex-project/unit.test.ts`, `non-react-project/unit.test.ts`            |
| `next/og`           | Next.js Open Graph image API using Satori-style JSX rendering.                       | `tw`            | runtime import only          | `next-og-project/unit.test.ts`                                             |
| `@vercel/og`        | Vercel Open Graph image API using Satori-style JSX rendering.                        | `tw`            | runtime import only          | `vercel-og-project/unit.test.ts`                                           |
| `satori`            | JSX-to-image renderer that accepts Tailwind-style `tw` styling props.                | `tw`            | runtime import only          | `satori-project/unit.test.ts`                                              |
| `twin.macro`        | Tailwind CSS-in-JS macro that transforms the JSX `tw` prop at build time.            | `tw`            | runtime import only          | `twin-macro-project/unit.test.ts`                                          |

The `What it does` column should briefly explain why the library matters for S6747. Prefer one sentence that includes:

- the library's domain or role;
- the JSX prop behavior that motivates the exception;
- the company, project, or ecosystem behind it when that helps explain adoption or importance.

Runtime import detection must ignore type-only imports. Type-only coverage currently lives in `non-react-project/unit.test.ts`, `twin-macro-project/unit.test.ts`, and `vercel-og-project/unit.test.ts`.

## Excluded libraries

Use this table for libraries that were investigated and deliberately not added. This avoids revisiting the same large or unsafe candidates in later passes.

| Library / framework                                                                    | Domain              | Reason for exclusion                                                                                                                                                                                                                 | Revisit condition                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `@react-three/fiber`                                                                   | Canvas / 3D         | Team decision: the JSX attribute surface is too large and unmanageable for S6747. A previous JS-1793 approach required report-level suppression plus a generated three.js element list, which is too much maintenance for this rule. | Revisit only if the team accepts a larger maintained allowlist/suppression model, or if a small documented prop subset emerges. |
| `@react-three/drei`                                                                    | Canvas / 3D         | Helper component ecosystem built on R3F; skip while the underlying R3F model is excluded.                                                                                                                                            | Revisit only if R3F itself becomes accepted.                                                                                    |
| `goober`                                                                               | Styling / CSS-in-JS | The core package is popular, but its raw JSX `css` prop requires `@agney/babel-plugin-goober-css-prop`, whose package signal is too weak to justify an S6747 exception.                                                              | Revisit only if the CSS prop becomes part of a widely adopted Goober setup or the enabling package becomes popular.             |
| `@stitches/react`                                                                      | Styling / CSS-in-JS | The `css` prop is for Stitches styled components, not a raw intrinsic JSX prop exception.                                                                                                                                            | Revisit only if official docs show `css` is valid on intrinsic JSX elements handled by S6747.                                   |
| `react-konva`                                                                          | Canvas / graphics   | Konva props such as `x`, `y`, `fill`, and `draggable` are documented on imported capitalized React components like `<Stage>`, `<Layer>`, and `<Rect>`, not intrinsic JSX elements reported by S6747.                                 | Revisit only if official docs show lowercase/custom host JSX elements handled by S6747.                                         |
| `@pixi/react`                                                                          | Canvas / WebGL      | Pixi React v8 uses lowercase custom host elements such as `<pixiContainer>` and `<pixiSprite>`, but the valid prop surface follows Pixi object/class properties and extensions, which is too broad and version-sensitive for S6747.  | Revisit only if a small documented prop subset emerges, or if the team accepts a larger maintained allowlist/suppression model. |
| `@react-spring/konva`                                                                  | Canvas / animation  | React Spring's Konva target animates react-konva components and wrappers; it does not make a small raw intrinsic JSX prop valid.                                                                                                     | Revisit only if docs show a raw intrinsic or custom host prop affected by S6747.                                                |
| `react-native-web`                                                                     | Mobile / platform   | React Native Web props are documented on capitalized primitives such as `<View>` and `<Text>`, which the wrapped upstream rule does not treat like DOM intrinsic elements.                                                           | Revisit only with a concrete lowercase/custom-host false-positive report and an observable narrow signal.                       |
| `@expo/html-elements`                                                                  | Mobile / platform   | The main API is capitalized semantic components. Its Babel plugin can rewrite lowercase DOM/SVG source to native components, but that path is config-bound and no small documented prop subset was identified.                       | Revisit only with a concrete user report plus a narrow, observable activation signal.                                           |
| `@linaria/react`                                                                       | Styling / CSS-in-JS | Linaria React exposes styled components and class-name generation; official usage applies generated classes through `className`, not a raw JSX `css` prop on intrinsic elements.                                                     | Revisit only if official docs show a supported raw intrinsic JSX prop.                                                          |
| `@linaria/core` / `@linaria/atomic` / `@linaria/server`                                | Styling / CSS-in-JS | Adjacent Linaria packages expose class extraction, atomic CSS, or server utilities, with no supported raw JSX prop surface for S6747.                                                                                                | Revisit only if an adjacent Linaria package documents a raw intrinsic JSX prop.                                                 |
| `babel-plugin-css-prop`                                                                | Styling / CSS-in-JS | This old third-party Linaria-adjacent plugin can enable a raw `css` prop only through Babel configuration, and its package signal is too weak to justify an exception.                                                               | Revisit only if the package or setup becomes widely adopted and detectable.                                                     |
| `@vanilla-extract/css`                                                                 | Styling / CSS-in-JS | Vanilla-extract generates class names that are applied with normal `className`; it is not a JSX prop-first styling system.                                                                                                           | Revisit only if official docs introduce a raw intrinsic JSX prop.                                                               |
| `@vanilla-extract/sprinkles` / `@vanilla-extract/recipes` / `@vanilla-extract/dynamic` | Styling / CSS-in-JS | Official vanilla-extract utility packages return class names or normal `style` values, not invalid named JSX props needing an S6747 exception.                                                                                       | Revisit only if official docs introduce a raw intrinsic JSX prop.                                                               |
| `rainbow-sprinkles` / `@dessert-box/react`                                             | Styling / CSS-in-JS | These community vanilla-extract wrappers expose style props through custom components such as `Box`, not raw intrinsic JSX elements.                                                                                                 | Revisit only if they document raw intrinsic JSX props and become important enough to support.                                   |
| `@mui/material` / `@mui/system`                                                        | UI system           | MUI's `sx` prop is for MUI/System components such as `Box`, not raw DOM elements. Ignoring `sx` across an MUI dependency would suppress legitimate raw DOM issues.                                                                   | Revisit only if official docs show `sx` is valid on intrinsic JSX elements handled by S6747.                                    |
| `@chakra-ui/react`                                                                     | UI system           | Chakra style props apply to Chakra components and `chakra.*` factory components, not raw intrinsic JSX elements that need a global ignore list.                                                                                      | Revisit only if official docs show a raw intrinsic JSX prop affected by S6747.                                                  |
| `antd` / `react-bootstrap`                                                             | UI system           | Custom props are documented on imported component APIs, not raw intrinsic JSX elements.                                                                                                                                              | Revisit only with a concrete raw intrinsic false-positive report.                                                               |
| `recharts` / `react-chartjs-2`                                                         | Charts / dataviz    | Chart props such as `data`, `dataKey`, and `options` are component props on imported chart components.                                                                                                                               | Revisit only with a concrete raw intrinsic or custom host false-positive report.                                                |
| `framer-motion`                                                                        | Animation           | Motion props such as `animate`, `initial`, and `whileHover` apply to `motion.*` member-expression components; adding them as global ignores would be too broad.                                                                      | Revisit only if a narrow raw intrinsic/custom host signal emerges.                                                              |
| `@react-spring/web`                                                                    | Animation           | Animated values are passed through `animated.*` wrapper components or normal `style`, not raw invalid JSX props.                                                                                                                     | Revisit only with a concrete raw intrinsic false-positive report.                                                               |
| `@use-gesture/react`                                                                   | Gesture             | The React package returns spread event bindings from hooks; there is no fixed invalid prop name for S6747 to ignore.                                                                                                                 | Revisit only if a stable documented prop name becomes relevant.                                                                 |
| `@tiptap/react` / `lexical` / `draft-js`                                               | Rich text / editors | Editor props are on library components and plugin APIs, not raw intrinsic JSX elements.                                                                                                                                              | Revisit only with a concrete raw intrinsic false-positive report.                                                               |
| `slate`                                                                                | Rich text / editors | Slate render callbacks spread documented attributes such as `data-slate-*`, `dir`, `ref`, and `contentEditable` onto DOM nodes; no unsupported named prop exception was identified.                                                  | Revisit only if a specific invalid named prop is documented and reported.                                                       |

## Research funnel

1. Pick a domain.
2. List dominant React libraries in that domain.
3. Discover candidates before classification; do not limit the pass to the seed examples in the domain map.
4. Rank by npm weekly downloads first; use GitHub stars and ecosystem visibility as tie-breakers.
5. Check official docs/examples for custom JSX props.
6. Classify detection:
   - `dependency`: package presence is enough.
   - `runtime import`: current file must import the API.
   - `config`: pragma, `jsxImportSource`, Babel/SWC plugin, or framework config required.
   - `unsafe`: too broad or not detectable with current S6747 signals.
7. Recommend one of the allowed decisions from the parallel research workflow.
8. If the coordinator accepts a candidate, implement it with tests:
   - valid with signal;
   - invalid without signal;
   - invalid with type-only import when using import detection;
   - unrelated unknown props still report.

## Parallel research workflow

Use subagents for research and classification only. The main coordinator owns edits to this document and any S6747 implementation changes.

Do not let multiple subagents write to this document concurrently. If parallel work needs written artifacts, each subagent writes a separate scratch file under `target/s6747-jsx-prop-survey/`, for example:

- `target/s6747-jsx-prop-survey/styling.md`
- `target/s6747-jsx-prop-survey/canvas.md`
- `target/s6747-jsx-prop-survey/mobile.md`
- `target/s6747-jsx-prop-survey/popular-skip-audit.md`

The coordinator then reviews those outputs, resolves conflicts, and updates this document.

Suggested subagent split:

- Styling / CSS-in-JS leftovers.
- Canvas, graphics, and custom renderers, excluding R3F unless the team decision changes.
- Mobile and platform abstractions.
- Popular libraries likely to be skipped: UI systems, charts, animation, gesture, rich text.

Each subagent must first discover plausible libraries in its domain, then classify the most promising ones. Seed libraries are starting points, not a closed list.

Each subagent must return findings in this format:

| Library | Domain | Purpose / owner | Popularity signal | JSX prop behavior | Intrinsic/custom host element? | Detection signal | Decision | Notes |
| ------- | ------ | --------------- | ----------------: | ----------------- | ------------------------------ | ---------------- | -------- | ----- |
|         |        |                 |                   |                   |                                |                  |          |       |

Allowed decisions:

- `add simple prop exception`
- `exclude: too broad`
- `exclude: component-only props`
- `exclude: weak signal`
- `already covered`
- `needs coordinator decision`

Subagents should not implement code. The coordinator implements accepted candidates one by one with a failing test first.

## Domain map

| Domain                   | Why it matters for S6747                                                                  | First libraries to inspect                                 |
| ------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Styling / CSS-in-JS      | Most likely to add `css`, `sx`, `tw`, `jsx`, `global`.                                    | Linaria, vanilla-extract; goober and Stitches are excluded |
| Canvas / WebGL / 3D      | Often uses custom JSX host elements and non-DOM props.                                    | react-konva; R3F and Drei are excluded                     |
| SVG / graphics rendering | May add rendering-specific props or custom host nodes.                                    | react-konva, icon/rendering helpers                        |
| Charts / dataviz         | Usually component props, less likely intrinsic JSX props.                                 | Recharts, react-chartjs-2, Victory, Nivo                   |
| Animation / gesture      | Usually component or hook APIs, but may add motion-specific elements/props.               | framer-motion, react-spring, use-gesture                   |
| Rich text / editors      | Usually component/plugin APIs; likely low S6747 impact.                                   | TipTap, Lexical, Slate, Draft.js                           |
| Mobile / responsive      | May introduce platform-like elements or responsive props.                                 | react-native-web, react-responsive, Expo HTML elements     |
| UI component systems     | Very popular, but props often apply only to library components. High false-negative risk. | MUI, Chakra UI, Ant Design, React Bootstrap                |

## Open candidates for next pass

Use this table for candidates that are not accepted yet but should be investigated before more exclusions are added.

No open candidates currently.

## Initial npm popularity snapshot

Source: `api.npmjs.org/downloads/point/last-week/<package>`, fetched 2026-07-29. Use as triage signal only; refresh before making final decisions.

| Package                         |            Domain | npm last-week downloads | Known/suspected JSX prop surface                          | Status / decision                  |
| ------------------------------- | ----------------: | ----------------------: | --------------------------------------------------------- | ---------------------------------- |
| `styled-jsx`                    |           Styling |                   46.5M | `jsx`, `global` on `<style>`                              | already covered, dependency        |
| `@emotion/react`                |           Styling |                   20.0M | `css`                                                     | already covered, dependency/import |
| `styled-components`             |           Styling |                   11.3M | `css`                                                     | covered, dependency/import         |
| `goober`                        |           Styling |                    8.2M | `css` prop requires `@agney/babel-plugin-goober-css-prop` | excluded; see Excluded libraries   |
| `@vanilla-extract/css`          |           Styling |                    2.3M | class extraction, not JSX prop-first                      | excluded; see Excluded libraries   |
| `@stylexjs/stylex`              |           Styling |                    1.2M | `sx` shorthand on raw JSX through StyleX Babel plugin     | covered, dependency/import         |
| `@stitches/react`               |           Styling |                    1.1M | `css` prop on Stitches styled components                  | excluded; see Excluded libraries   |
| `@compiled/react`               |           Styling |                    730k | `css` prop                                                | covered, dependency/import         |
| `@linaria/react`                |           Styling |                    455k | styled components / css helper                            | excluded; see Excluded libraries   |
| `theme-ui` / `@theme-ui/core`   |           Styling |               77k / 86k | `sx`                                                      | already covered, dependency/import |
| `twin.macro`                    |           Styling |                     57k | `tw`                                                      | already covered, runtime import    |
| `@react-three/fiber`            |       Canvas / 3D |                    4.6M | custom JSX host elements and 3D props                     | excluded; see Excluded libraries   |
| `@react-three/drei`             |       Canvas / 3D |                    3.5M | R3F helper components                                     | excluded; see Excluded libraries   |
| `react-konva`                   | Canvas / graphics |                    1.7M | canvas component props                                    | excluded; see Excluded libraries   |
| `@pixi/react`                   | Canvas / graphics |                     76k | lowercase Pixi host elements with large prop surface      | excluded; see Excluded libraries   |
| `framer-motion`                 |         Animation |                   40.9M | `motion.*` components, not raw DOM props                  | excluded; see Excluded libraries   |
| `@react-spring/web`             |         Animation |                    5.4M | animated components/style props                           | excluded; see Excluded libraries   |
| `@use-gesture/react`            |           Gesture |                    5.8M | hook returns event bindings                               | excluded; see Excluded libraries   |
| `recharts`                      |            Charts |                   54.8M | chart component props                                     | excluded; see Excluded libraries   |
| `react-chartjs-2`               |            Charts |                    4.1M | chart component props                                     | excluded; see Excluded libraries   |
| `@tiptap/react`                 |         Rich text |                   12.3M | editor components                                         | excluded; see Excluded libraries   |
| `lexical`                       |         Rich text |                    4.5M | editor APIs/components                                    | excluded; see Excluded libraries   |
| `slate`                         |         Rich text |                    2.8M | editor attributes via spread                              | excluded; see Excluded libraries   |
| `react-native-web`              |   Mobile/platform |                    4.8M | RN-style props on RN primitives                           | excluded; see Excluded libraries   |
| `@expo/html-elements`           |   Mobile/platform |                    208k | semantic components; optional lowercase Babel rewrite     | excluded; see Excluded libraries   |
| `@mui/material` / `@mui/system` |         UI system |           10.3M / 11.1M | `sx` on MUI/System components                             | excluded; see Excluded libraries   |
| `@chakra-ui/react`              |         UI system |                    1.8M | style props on Chakra components                          | excluded; see Excluded libraries   |
| `antd`                          |         UI system |                    3.8M | component props                                           | excluded; see Excluded libraries   |
| `react-bootstrap`               |         UI system |                    1.6M | component props                                           | excluded; see Excluded libraries   |

## 2026-07-29 parallel pass outcome

The recommended parallel pass was completed across canvas/custom renderers, mobile/platform abstractions, styling leftovers, and popular skip candidates. No library from that seeded candidate batch met the threshold for a new simple S6747 prop exception.

Follow-up sanity check: the pass over-constrained subagents to preselected libraries instead of requiring open-ended discovery per domain. StyleX was then found outside the seed list and added as an open candidate for the restart.

Coordinator decisions:

- `react-konva`, `react-native-web`, UI systems, charts, animation wrappers, and rich text editor packages are component-only or spread-based for S6747's purposes.
- `@pixi/react` and the earlier R3F family are real custom-renderer overlaps, but their prop surfaces are too large and version-sensitive for the current ignore-list model.
- `@expo/html-elements` has a possible lowercase-source path through Babel configuration, but the signal is not observable through dependency/import alone and no small documented prop subset was identified.
- Linaria and vanilla-extract packages are class-name/extraction APIs, not raw JSX prop systems.
- StyleX's documented `sx` shorthand is raw-intrinsic relevant and is covered with the same dependency/import activation model as the existing Theme UI `sx` exception.

Next discovery work should restart from discovery-first domain prompts.

## Decision thresholds

Good S6747 candidate:

- popular enough to matter;
- official docs show the prop is valid in the relevant JSX shape;
- activation can be detected from current signals or a small, safe extension;
- narrow tests can prove no broad false negatives.

Bad candidate:

- prop is valid only on library components;
- requires project config we cannot observe;
- would require suppressing common prop names too broadly;
- no clear official docs or user reports.
