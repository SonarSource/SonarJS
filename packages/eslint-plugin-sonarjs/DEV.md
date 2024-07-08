# eslint-plugin-sonarjs dev notes

## build package

- in root `package.json`, run `npm run eslint-plugin:pack`

## build it for integration tests

- run `tools/eslint-plugin-sonarjs/build-to-its.sh`

## tests

in `its/eslint-plugin/sonarjs`

## Upgrade

- Sync versions: `tools/eslint-plugin-sonarjs/sync-version.mjs`
- Sync other: `tools/eslint-plugin-sonarjs/sync-package-jsons.mjs`
