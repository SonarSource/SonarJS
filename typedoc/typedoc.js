// https://typedoc.org/guides/options
module.exports = {
  entryPoints: ['../packages/jsts/src/rules/helpers/index.ts'],
  name: 'SonarJS linter helper functions',
  out: './site',
  searchInComments: true,
  plugin: ['searchable-parameters-plugin'],
  readme: './main.md',
  tsconfig: '../packages/tsconfig.json',
  json: 'models/reflections.json',
  pretty: true,
  sidebarLinks: {
    'ESlint dev guide': 'https://eslint.org/docs/latest/developer-guide/working-with-rules',
  },
  skipErrorChecking: true,
  visibilityFilters: {},
};
