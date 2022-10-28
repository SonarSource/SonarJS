module.exports = {
  entryPoints: ["../src/linting/eslint/rules/helpers/index.ts"],
  out: "./docs",
  searchInComments: true,
  plugin: ["my-plugin"],
  readme: "./README.md",
  tsconfig: "../src/tsconfig.json"
}
