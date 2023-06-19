# Bundle ESLint-bridge

## pkg (by Vercel)

Make sure that you have transpile TS using: `npm run compile`
The build binary will also include the files/folders specified in the root `package.json`, under `pkg:assets`.

```bash
./bundle/node_modules/.bin/pkg . --out-path=bundle/dist --targets=node18-macos-arm64,node18-win-x64,node18-macos-x64,node18-linux-x64
```

## native

[Instructions](https://nodejs.org/api/single-executable-applications.html)

## caxa

```bash
./node_modules/.bin/caxa --input caxa --output dist-caxa/sonarjs -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/bin/server"
```
