#! /bin/bash

npm run bridge:compile

cpy lib packages/eslint-plugin-sonarjs

npm pack --workspaces

rm -rf packages/eslint-plugin-sonarjs/lib

cp eslint-plugin-sonarjs-1.0.3.tgz its/eslint-plugin-sonarjs

cd its/eslint-plugin-sonarjs

rm -rf node_modules/eslint-plugin-sonarjs

npm i ./eslint-plugin-sonarjs-1.0.3.tgz --no-save
