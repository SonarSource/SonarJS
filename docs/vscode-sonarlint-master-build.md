# Testing VS Code SonarLint with the latest SonarJS master build

This guide explains how to patch a local VS Code SonarLint installation so that JavaScript, TypeScript, and CSS analysis uses the latest SonarJS master build from Repox.

The extension is now branded **SonarQube for IDE**, but the VS Code package name is still `sonarsource.sonarlint-vscode`, and the logs still use `sonarlint-vscode`.

This is a local testing workflow only. Updating or reinstalling the extension will overwrite the patched files.

## Why both `sonarjs.jar` and `eslint-bridge` must be updated

Replacing `analyzers/sonarjs.jar` alone is not enough.

During analysis, SonarLint passes `sonar.js.internal.bundlePath=<extension>/eslint-bridge`, and the Node bridge starts from `eslint-bridge/package/bin/server.cjs`. The live JavaScript runtime therefore comes from the extracted `eslint-bridge` payload, not directly from the Java classes inside `sonarjs.jar`.

To test a new master build reliably, patch the jar and refresh `eslint-bridge` from the same jar.

## 1. Locate the extension directory

When VS Code is connected to WSL or another remote environment, patch the server-side extension, not the desktop-side copy.

Use this to discover the installed extension:

```bash
find "$HOME/.vscode-server/extensions" "$HOME/.vscode/extensions" \
  -maxdepth 1 -type d -name 'sonarsource.sonarlint-vscode-*' 2>/dev/null | sort
```

Then export the path you want to patch:

```bash
SONARLINT_EXT="$HOME/.vscode-server/extensions/sonarsource.sonarlint-vscode-5.2.1"
```

## 2. Back up the current files

```bash
STAMP="$(date +%Y%m%dT%H%M%S%z)"

cp "$SONARLINT_EXT/analyzers/sonarjs.jar" \
  "$SONARLINT_EXT/analyzers/sonarjs.jar.bak-$STAMP"

if [ -d "$SONARLINT_EXT/eslint-bridge" ]; then
  mv "$SONARLINT_EXT/eslint-bridge" \
    "$SONARLINT_EXT/eslint-bridge.bak-$STAMP"
fi
```

## 3. Download the latest master build from Repox

Use the Repox JFrog Web UI to download the same Maven artifact with these coordinates:

- repository: `sonarsource-public-builds`
- groupId: `org.sonarsource.javascript`
- artifactId: `sonar-javascript-plugin`
- extension: `jar`

In the Artifactory browser, those coordinates map to:

```text
sonarsource-public-builds/org/sonarsource/javascript/sonar-javascript-plugin/
```

In the left-hand tree, expand `sonarsource-public-builds`, then `org`, `sonarsource`, `javascript`, and `sonar-javascript-plugin`. Then:

1. Open the newest version directory under `sonar-javascript-plugin`.
2. Download the file named `sonar-javascript-plugin-<version>.jar`.
3. Do not download `maven-metadata.xml`, `*.pom`, `*.md5`, `*.sha*`, or source/javadoc artifacts if they are shown.

Point `PATCH_JAR` at the downloaded file before continuing:

```bash
PATCH_JAR="$HOME/Downloads/sonar-javascript-plugin-<version>.jar"
```

If your browser downloaded the jar onto a different machine or filesystem than the shell you are using next, copy it into the shell's filesystem first, then update `PATCH_JAR` to that copied path. This matters in WSL or other remote setups.

If you already have a locally built `sonar-javascript-plugin-*.jar`, use that jar instead of downloading one.

## 4. Replace the analyzer jar

```bash
cp "$PATCH_JAR" "$SONARLINT_EXT/analyzers/sonarjs.jar"
```

Optional sanity check:

```bash
unzip -p "$SONARLINT_EXT/analyzers/sonarjs.jar" META-INF/MANIFEST.MF \
  | grep -E 'Plugin-Version|Plugin-Display-Version|Implementation-Build'
```

## 5. Rebuild `eslint-bridge` from the patched jar

The jar embeds the Node payload as `sonarjs-1.0.0.tgz`. Extract it into the extension directory:

```bash
mkdir -p "$SONARLINT_EXT/eslint-bridge"

unzip -p "$SONARLINT_EXT/analyzers/sonarjs.jar" sonarjs-1.0.0.tgz \
  | tar -xzf - -C "$SONARLINT_EXT/eslint-bridge"
```

Quick check:

```bash
test -f "$SONARLINT_EXT/eslint-bridge/package/bin/server.cjs"
```

If `server.cjs` is missing, SonarLint will fail to start the bridge and the patch is incomplete.

## 6. Restart VS Code and trigger analysis

Reload or restart VS Code, then open a JavaScript or TypeScript file and let SonarLint analyze it.

Do not rely on extension startup alone to recreate `eslint-bridge`. In WSL testing, removing that folder and starting VS Code again did not recreate it eagerly, and JS/TS analysis failed until the bridge files were restored.

## 7. Verify the patched runtime through the logs

In WSL or remote sessions, SonarLint logs are stored under:

```text
~/.vscode-server/data/logs/<session>/exthost1/SonarSource.sonarlint-vscode/SonarQube for IDE.log
```

Pick the newest log:

```bash
LATEST_LOG="$(find "$HOME/.vscode-server/data/logs" \
  -path '*SonarSource.sonarlint-vscode/SonarQube for IDE.log' | sort | tail -n 1)"
```

Then inspect the lines that matter:

```bash
grep -En 'Starting analysis with configuration|sonar\.js\.internal\.bundlePath|server\.cjs' \
  "$LATEST_LOG"
```

What you want to see:

- `Starting analysis with configuration`
- `sonar.js.internal.bundlePath=<your extension>/eslint-bridge`
- no `Node.js script to start the bridge server doesn't exist` error

## 8. Restore the official extension files

If you open a new shell before restoring, re-export `SONARLINT_EXT` and set `STAMP` to the backup timestamp first. To find it, list the backup jar names and reuse the suffix after `sonarjs.jar.bak-`:

```bash
ls "$SONARLINT_EXT"/analyzers/sonarjs.jar.bak-*
```

```bash
cp "$SONARLINT_EXT/analyzers/sonarjs.jar.bak-$STAMP" \
  "$SONARLINT_EXT/analyzers/sonarjs.jar"

if [ -d "$SONARLINT_EXT/eslint-bridge.bak-$STAMP" ]; then
  rm -rf "$SONARLINT_EXT/eslint-bridge"
  mv "$SONARLINT_EXT/eslint-bridge.bak-$STAMP" \
    "$SONARLINT_EXT/eslint-bridge"
fi
```

Reinstalling or updating the extension also restores the official files.

## Troubleshooting

- If you patched the jar but analysis still behaves like the old build, check `sonar.js.internal.bundlePath` in the logs. SonarLint is probably still using an old `eslint-bridge` directory.
- If the logs mention `server.cjs` does not exist, the `eslint-bridge` extraction step failed or the folder was removed.
- If nothing changes in a WSL session, make sure you patched `~/.vscode-server/extensions/...` and not the desktop extension under `~/.vscode/extensions/...`.
- If VS Code updates the extension, the versioned extension directory changes and the patch must be applied again.
