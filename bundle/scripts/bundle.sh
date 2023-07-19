#! /bin/sh

# working dir fix
SCRIPT_FOLDER=$(cd $(dirname "$0"); pwd)
cd "$SCRIPT_FOLDER/.."

echo "installing pkg in bundle/ folder"
npm ci

# go to the root of the project
cd ..

echo "removing dev dependencies from root"
npm prune --omit=dev

# build bundle
./bundle/node_modules/.bin/pkg . --out-path=bundle/dist --targets=node16-macos-arm64 # TODO add other platforms: ,node18-macos-x64,node18-win-x64,node18-linux-x64

# compress
xz -v -9 -f -k ./bundle/dist/sonarjs

# go back to root
cd "$SCRIPT_FOLDER/../.."

# fetch back the dev dependencies
npm ci
