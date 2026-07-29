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

| Library / framework  | Domain              | Reason for exclusion                                                                                                                                                                                                                 | Revisit condition                                                                                                               |
| -------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `@react-three/fiber` | Canvas / 3D         | Team decision: the JSX attribute surface is too large and unmanageable for S6747. A previous JS-1793 approach required report-level suppression plus a generated three.js element list, which is too much maintenance for this rule. | Revisit only if the team accepts a larger maintained allowlist/suppression model, or if a small documented prop subset emerges. |
| `@react-three/drei`  | Canvas / 3D         | Helper component ecosystem built on R3F; skip while the underlying R3F model is excluded.                                                                                                                                            | Revisit only if R3F itself becomes accepted.                                                                                    |
| `goober`             | Styling / CSS-in-JS | The core package is popular, but its raw JSX `css` prop requires `@agney/babel-plugin-goober-css-prop`, whose package signal is too weak to justify an S6747 exception.                                                              | Revisit only if the CSS prop becomes part of a widely adopted Goober setup or the enabling package becomes popular.             |
| `@stitches/react`    | Styling / CSS-in-JS | The `css` prop is for Stitches styled components, not a raw intrinsic JSX prop exception.                                                                                                                                            | Revisit only if official docs show `css` is valid on intrinsic JSX elements handled by S6747.                                   |

## Research funnel

1. Pick a domain.
2. List dominant React libraries in that domain.
3. Rank by npm weekly downloads first; use GitHub stars and ecosystem visibility as tie-breakers.
4. Check official docs/examples for custom JSX props.
5. Classify detection:
   - `dependency`: package presence is enough.
   - `runtime import`: current file must import the API.
   - `config`: pragma, `jsxImportSource`, Babel/SWC plugin, or framework config required.
   - `unsafe`: too broad or not detectable with current S6747 signals.
6. Recommend one of the allowed decisions from the parallel research workflow.
7. If the coordinator accepts a candidate, implement it with tests:
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

## Initial npm popularity snapshot

Source: `api.npmjs.org/downloads/point/last-week/<package>`, fetched 2026-07-29. Use as triage signal only; refresh before making final decisions.

| Package                         |            Domain | npm last-week downloads | Known/suspected JSX prop surface                          | Status / decision                                                |
| ------------------------------- | ----------------: | ----------------------: | --------------------------------------------------------- | ---------------------------------------------------------------- |
| `styled-jsx`                    |           Styling |                   46.5M | `jsx`, `global` on `<style>`                              | already covered, dependency                                      |
| `@emotion/react`                |           Styling |                   20.0M | `css`                                                     | already covered, dependency/import                               |
| `styled-components`             |           Styling |                   11.3M | `css`                                                     | covered, dependency/import                                       |
| `goober`                        |           Styling |                    8.2M | `css` prop requires `@agney/babel-plugin-goober-css-prop` | excluded; see Excluded libraries                                 |
| `@vanilla-extract/css`          |           Styling |                    2.3M | class extraction, not JSX prop-first                      | probably skip                                                    |
| `@stitches/react`               |           Styling |                    1.1M | `css` prop on Stitches styled components                  | excluded; see Excluded libraries                                 |
| `@compiled/react`               |           Styling |                    730k | `css` prop                                                | covered, dependency/import                                       |
| `@linaria/react`                |           Styling |                    455k | styled components / css helper                            | likely skip unless intrinsic repro exists                        |
| `theme-ui` / `@theme-ui/core`   |           Styling |               77k / 86k | `sx`                                                      | already covered, dependency/import                               |
| `twin.macro`                    |           Styling |                     57k | `tw`                                                      | already covered, runtime import                                  |
| `@react-three/fiber`            |       Canvas / 3D |                    4.6M | custom JSX host elements and 3D props                     | excluded; see Excluded libraries                                 |
| `@react-three/drei`             |       Canvas / 3D |                    3.5M | R3F helper components                                     | excluded; see Excluded libraries                                 |
| `react-konva`                   | Canvas / graphics |                    1.7M | canvas element/component props                            | inspect                                                          |
| `framer-motion`                 |         Animation |                   40.9M | `motion.*` components, not raw DOM props                  | probably skip                                                    |
| `@react-spring/web`             |         Animation |                    5.4M | animated components/style props                           | probably skip                                                    |
| `@use-gesture/react`            |           Gesture |                    5.8M | hook returns event bindings                               | probably skip                                                    |
| `recharts`                      |            Charts |                   54.8M | chart component props                                     | probably skip                                                    |
| `react-chartjs-2`               |            Charts |                    4.1M | chart component props                                     | probably skip                                                    |
| `@tiptap/react`                 |         Rich text |                   12.3M | editor components                                         | probably skip                                                    |
| `lexical`                       |         Rich text |                    4.5M | editor APIs/components                                    | probably skip                                                    |
| `react-native-web`              |   Mobile/platform |                    4.8M | RN-style props on RN primitives                           | inspect only if S6747 sees them as JSX intrinsic/custom elements |
| `@mui/material` / `@mui/system` |         UI system |           10.3M / 11.1M | `sx` on MUI/System components                             | likely skip for raw DOM exception                                |
| `@chakra-ui/react`              |         UI system |                    1.8M | style props on Chakra components                          | likely skip for raw DOM exception                                |
| `antd`                          |         UI system |                    3.8M | component props                                           | skip                                                             |
| `react-bootstrap`               |         UI system |                    1.6M | component props                                           | skip                                                             |

## Recommended next pass

Prioritize investigations in this order:

1. Canvas / custom renderer space:
   - `react-konva`
2. Mobile/platform:
   - `react-native-web`
   - `@expo/html-elements`
3. Styling leftovers:
   - `@linaria/react`
   - `@vanilla-extract/css`
4. Popular skip audit:
   - UI systems
   - charts
   - animation and gesture
   - rich text editors

Use the parallel research workflow table as the canonical per-library output format.

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
