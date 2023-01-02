# Typedoc

This page explains how to use [Typedoc](https://typedoc.org/).

## Generate site

Run `npm run td` in `eslint-bridge/` to generate the site at `typedoc/site/index.html` which you can open in your browser.

This also generates a JSON file of the models that are displayed, which you can find in `typedoc/models/reflections.json`. It was used to review the data that was available to display to implement the `searchable-parameters-plugin`.

The configuration for Typedoc at `typedoc/typedoc.js` is set to only display functions exposed by `src/linting/eslint/rules/helpers/index.ts`.
