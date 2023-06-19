#! /bin/sh

# working dir fix
SCRIPT_FOLDER=$(cd $(dirname "$0"); pwd)
cd "$SCRIPT_FOLDER/.."

# install pkg
npm ci

# go to the root of the project
cd ..

# remove dev dependencies
npm prune --omit=dev

# build bundle
./bundle/node_modules/.bin/pkg . --out-path=bundle/dist --targets=node18-macos-arm64 # TODO add other platforms

# compress
xz -v -9 ./bundle/dist/sonarjs



