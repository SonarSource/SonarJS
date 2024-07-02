#! /bin/bash
cd packages/jsts/src/rules
rm -rf lib
cd ../../../..
npm run bridge:compile
cp -R lib packages/jsts/src/rules
cd packages/jsts/src/rules
npm pack
cp eslint-plugin-sonarjs-1.0.3.tgz ../../../../its/eslint-plugin-sonarjs
cd ../../../../its/eslint-plugin-sonarjs
rm -rf node_modules package-lock.json
npm i
npm test
