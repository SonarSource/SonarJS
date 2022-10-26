module.exports = {
  entryPoints: ["./linting/eslint/rules/helpers/index.ts"],
  out: "docs",
  searchInComments: true,
  plugin: ["my-plugin"],
}
