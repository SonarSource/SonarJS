# Testing VS Code SonarLint with the latest SonarJS master build

This guide explains how to patch a local VS Code SonarLint installation so that JavaScript, TypeScript, and CSS analysis uses the latest SonarJS master build from Repox.

The extension is now branded **SonarQube for IDE**, but the VS Code package name is still `sonarsource.sonarlint-vscode`, and the logs still use `sonarlint-vscode`.

This is a local testing workflow only. Updating or reinstalling the extension creates a new versioned extension directory, which naturally resets any local patch.

## Automated helper script

The repo now includes a helper script that rebuilds from the current checkout and patches the extension in one command:

```bash
tools/patch-vscode-sonarlint.mjs
```

Normal patch mode is now always `rebuild + patch`. The helper runs:

```bash
mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package
```

before touching the installed extension, so a failed build leaves the extension untouched. That Maven build may update generated tracked files such as README rule counts.

If you already have a jar, pass it explicitly:

```bash
tools/patch-vscode-sonarlint.mjs --jar "$HOME/Downloads/sonar-javascript-plugin-<version>.jar"
```

`--jar <path>` is the explicit opt-out from the automatic rebuild. `--build` is now only a compatibility alias and prints a warning because rebuild is already the default.

By default, the script prefers `~/.vscode-server/extensions/...` when present, otherwise `~/.vscode/extensions/...`. Use `--server`, `--desktop`, or `--ext <path>` to override that detection.

On the first successful patch of a given extension directory, the helper stores one original backup and keeps reusing it:

- `analyzers/sonarjs.jar.original`
- `eslint-bridge.original`

Subsequent patches rebuild again, patch again, and leave those original backups unchanged.

To restore the original official extension files captured for the current extension directory:

```bash
tools/patch-vscode-sonarlint.mjs --restore
```

`--restore latest` and `--restore original` are still accepted as compatibility aliases, but they now mean the same original-backup restore path.

The remaining sections document the manual flow that the script automates.

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

## 2. Capture the original files once

```bash
if [ ! -f "$SONARLINT_EXT/analyzers/sonarjs.jar.original" ]; then
  cp "$SONARLINT_EXT/analyzers/sonarjs.jar" \
    "$SONARLINT_EXT/analyzers/sonarjs.jar.original"
fi

if [ ! -d "$SONARLINT_EXT/eslint-bridge.original" ]; then
  cp -R "$SONARLINT_EXT/eslint-bridge" \
    "$SONARLINT_EXT/eslint-bridge.original"
fi
```

Do not overwrite those backups on later patches. They are the restore target for this versioned extension directory.

## 3. Download the latest master build from Repox

If you use the helper script without `--jar`, you can skip this section because the helper rebuilds from the current checkout automatically. This section is for the manual workflow or for `--jar`.

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

## 5. Refresh `eslint-bridge` from the patched jar

The jar embeds the Node payload as `sonarjs-*.tgz`. Refresh the extension directory from that payload:

```bash
BRIDGE_PAYLOAD="$(unzip -Z1 "$SONARLINT_EXT/analyzers/sonarjs.jar" \
  | grep -E '^sonarjs-.*\.tgz$' | head -n 1)"

rm -rf "$SONARLINT_EXT/eslint-bridge"
mkdir -p "$SONARLINT_EXT/eslint-bridge"

unzip -p "$SONARLINT_EXT/analyzers/sonarjs.jar" "$BRIDGE_PAYLOAD" \
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

Restore from the original backups created for this versioned extension directory:

```bash
cp "$SONARLINT_EXT/analyzers/sonarjs.jar.original" \
  "$SONARLINT_EXT/analyzers/sonarjs.jar"

rm -rf "$SONARLINT_EXT/eslint-bridge"
cp -R "$SONARLINT_EXT/eslint-bridge.original" \
  "$SONARLINT_EXT/eslint-bridge"
```

Reinstalling or updating the extension also restores the official files because VS Code switches to a new versioned extension directory.

## Troubleshooting

- If you patched the jar but analysis still behaves like the old build, check `sonar.js.internal.bundlePath` in the logs. SonarLint is probably still using an old `eslint-bridge` directory.
- If the logs mention `server.cjs` does not exist, the `eslint-bridge` extraction step failed or the folder was removed.
- If nothing changes in a WSL session, make sure you patched `~/.vscode-server/extensions/...` and not the desktop extension under `~/.vscode/extensions/...`.
- If VS Code updates the extension, the versioned extension directory changes and the patch must be applied again.
