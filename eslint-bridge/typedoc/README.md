# Typedoc

This page explains how to use [typedoc](https://typedoc.org/).

## Generate site

Run `npm run td` in `eslint-bridge/` to generate the site at `typedoc/docs/index.html` which you can open in your browser. This also generates a JSON file of the models that are displayed, which you can find in `typedoc/models/reflections.json`.

The configuration for typedoc at `typedoc/typedoc.js` is set to only display functions exposed by `src/linting/eslint/rules/helpers/index.ts`.
