# ESLint Hooks API (Recommended)

This document describes the recommended approach for integrating custom ESLint-based logic into SonarJS analysis using the `EslintHook` and `EslintHookRegistrar` APIs.

## Overview

ESLint hooks provide a mechanism for external plugins to execute custom logic during SonarJS analysis with full parser context available. Unlike the legacy Custom Rules API, hooks are:

- **Not associated with rule keys** - they don't raise Sonar issues directly
- **Executed independently of rule activation** - always run when enabled
- **Designed for data collection** - ideal for cross-file analysis, IR generation, metrics collection

## When to Use

Use ESLint Hooks when you need to:

- Collect data across multiple files for later analysis
- Generate intermediate representations (IR) for security analysis
- Integrate with external analysis tools
- Execute logic that doesn't map directly to Sonar rules

## Components

A complete ESLint Hook integration requires:

1. **Java Hook Class** - implements `EslintHook` and `EslintHookRegistrar`
2. **Rules Bundle** - packages the ESLint-side JavaScript code
3. **Plugin Class** - registers the hook with SonarQube

## Implementation Guide

### 1. Create the ESLint Hook Class

```java
package com.example.plugin;

import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.EslintHook;
import org.sonar.plugins.javascript.api.EslintHookRegistrar;
import org.sonar.plugins.javascript.api.Language;

public class MyEslintHook implements EslintHook, EslintHookRegistrar {

  @Override
  public String eslintKey() {
    // Must match the rule name exported by your ESLint plugin
    return "my-custom-hook";
  }

  @Override
  public List<InputFile.Type> targets() {
    // Which file types to analyze
    return List.of(InputFile.Type.MAIN, InputFile.Type.TEST);
  }

  @Override
  public List<AnalysisMode> analysisModes() {
    // When to run the hook
    return List.of(AnalysisMode.DEFAULT, AnalysisMode.SKIP_UNCHANGED);
  }

  @Override
  public List<String> blacklistedExtensions() {
    // File extensions to skip
    return List.of(".htm", ".html");
  }

  @Override
  public boolean isEnabled() {
    // Conditionally enable/disable the hook
    return true;
  }

  @Override
  public List<Object> configurations() {
    // Optional configuration passed to the ESLint rule
    return List.of();
  }

  @Override
  public void register(RegistrarContext registrarContext) {
    // Register for JavaScript and/or TypeScript analysis
    registrarContext.registerEslintHook(Language.JAVASCRIPT, this);
    registrarContext.registerEslintHook(Language.TYPESCRIPT, this);
  }
}
```

### 2. Create the Rules Bundle

The `RulesBundle` tells SonarJS where to find your ESLint plugin code:

```java
package com.example.plugin;

import org.sonar.plugins.javascript.api.RulesBundle;

public class MyRulesBundle implements RulesBundle {

  @Override
  public String bundlePath() {
    // Path to your bundled ESLint plugin (relative to JAR root)
    return "/my-eslint-plugin-1.0.0.tgz";
  }
}
```

### 3. Create the ESLint Plugin (JavaScript)

Create an ESLint plugin that exports your rule:

```javascript
// src/rules/my-custom-hook.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Custom hook for data collection',
    },
  },
  create(context) {
    return {
      Program(node) {
        // Your analysis logic here
        // Access the parsed AST, collect data, etc.
      },

      CallExpression(node) {
        // Visit specific node types
      },

      'Program:exit'(node) {
        // Finalize analysis for this file
      },
    };
  },
};
```

```javascript
// index.js
module.exports = {
  rules: {
    'my-custom-hook': require('./rules/my-custom-hook'),
  },
};
```

Bundle your plugin as a `.tgz` file and include it in your JAR resources.

### 4. Create the Plugin Class

```java
package com.example.plugin;

import org.sonar.api.Plugin;

public class MyPlugin implements Plugin {

  @Override
  public void define(Context context) {
    context.addExtensions(MyRulesBundle.class, MyEslintHook.class);
  }
}
```

### 5. Configure Maven Dependencies

Add the SonarJS API dependency to your `pom.xml`:

```xml
<dependency>
  <groupId>org.sonarsource.javascript</groupId>
  <artifactId>sonar-javascript-plugin</artifactId>
  <version>11.6.0</version>
  <classifier>api</classifier>
  <scope>provided</scope>
</dependency>
```

## Complete Example

See the [sonar-architecture](https://github.com/SonarSource/sonar-architecture) repository for a complete working example:

- `ArchitectureJsEslintHook.java` - Hook implementation
- `ArchitectureJsRulesBundle.java` - Bundle configuration
- `ArchitectureJsFrontendPlugin.java` - Plugin registration

## API Reference

### EslintHook Interface

| Method                    | Description                           | Default      |
| ------------------------- | ------------------------------------- | ------------ |
| `eslintKey()`             | ESLint rule name to execute           | Required     |
| `configurations()`        | Configuration passed to the rule      | Empty list   |
| `targets()`               | File types to analyze (MAIN, TEST)    | MAIN only    |
| `analysisModes()`         | When to run (DEFAULT, SKIP_UNCHANGED) | DEFAULT only |
| `blacklistedExtensions()` | Extensions to skip                    | Empty list   |
| `isEnabled()`             | Whether the hook should run           | `true`       |

### EslintHookRegistrar Interface

| Method                       | Description                                |
| ---------------------------- | ------------------------------------------ |
| `register(RegistrarContext)` | Called to register hooks for each language |

### RegistrarContext Interface

| Method                                     | Description                              |
| ------------------------------------------ | ---------------------------------------- |
| `registerEslintHook(Language, EslintHook)` | Registers a hook for a specific language |

## Best Practices

1. **Single hook for multiple languages** - Register the same hook instance for both JavaScript and TypeScript when the analysis logic is identical.

2. **Use `isEnabled()` for conditional execution** - Check configuration or context to determine if the hook should run.

3. **Handle analysis modes appropriately** - If your hook supports incremental analysis, include `AnalysisMode.SKIP_UNCHANGED`.

4. **Blacklist unsupported file types** - Use `blacklistedExtensions()` to skip files that your analysis doesn't support (e.g., HTML files for module-resolution-dependent analysis).

## Technical Details: How Hooks Are Integrated

This section explains how the ESLint Hooks API is wired into the SonarJS analysis pipeline.

### 1. Discovery via SonarQube Dependency Injection

Both `EslintHookRegistrar` and `RulesBundle` interfaces are annotated with `@ScannerSide`, which enables automatic discovery by SonarQube's dependency injection container:

```java
@ScannerSide
public interface EslintHookRegistrar { ... }

@ScannerSide
@SonarLintSide
public interface RulesBundle { ... }
```

When your plugin is loaded, SonarQube automatically:

1. Discovers all implementations of these interfaces
2. Instantiates them via reflection
3. Injects them as arrays into dependent components

### 2. Hook Registration in JsTsChecks (Bypasses CheckFactory)

The `JsTsChecks` class (`sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java`) receives all `EslintHookRegistrar` implementations via constructor injection:

```java
public JsTsChecks(
  CheckFactory checkFactory,
  @Nullable CustomRuleRepository[] customRuleRepositories,
  @Nullable EslintHookRegistrar[] eslintHookRegistrars
) {
  // Process each registrar - hooks are stored DIRECTLY, bypassing CheckFactory
  for (var registrar : eslintHookRegistrars) {
    registrar.register(
      (language, hook) -> eslintHooksByLanguage
        .computeIfAbsent(language, it -> new HashSet<>())
        .add(hook)
    );
  }

  // Built-in and custom rules go through CheckFactory (quality profile filtering)
  doAddChecks(Language.TYPESCRIPT, CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
  doAddChecks(Language.JAVASCRIPT, CheckList.JS_REPOSITORY_KEY, CheckList.getJavaScriptChecks());
  // ...
}
```

**Key difference from legacy API:** Hooks are stored directly in `eslintHooksByLanguage` map without going through `CheckFactory`. This means:

1. **No quality profile filtering**: Hooks always run when `isEnabled()` returns true
2. **No `eslintKey → RuleKey` mapping**: Hooks are not added to the `eslintKeyToRuleKey` map
3. **Cannot raise issues**: When the bridge returns issues, `ruleKeyByEslintKey()` won't find a mapping for hook eslintKeys, so issues are discarded

```
Legacy Rules (CustomRuleRepository):
  checkClasses → CheckFactory → filters by QP → checks map + eslintKeyToRuleKey map
                                                     ↓
                                              Can raise issues ✓

Hooks (EslintHookRegistrar):
  register() → directly stored → eslintHooksByLanguage map
                                        ↓
                                 Cannot raise issues ✗
                                 (no eslintKey → RuleKey mapping)
```

### 3. Bundle Deployment

The `RulesBundles` class (`sonar-plugin/bridge/.../RulesBundles.java`) handles deploying JavaScript bundles:

```java
public List<Path> deploy(Path target) {
  // For each bundle URL:
  // 1. Extract .tgz to temporary directory
  // 2. Return path to package/dist/rules.js
}
```

Bundles are extracted from the plugin JAR and deployed to a temporary directory before analysis starts.

### 4. Aggregating Enabled Rules

The `enabledEslintRules()` method in `JsTsChecks` combines all sources:

```java
public List<EslintRule> enabledEslintRules() {
  // 1. Built-in rules from CheckList
  // 2. Custom rules from CustomRuleRepository (legacy)
  // 3. Hooks from EslintHookRegistrar (new API)

  var eslintHooks = eslintHooksByLanguage
    .entrySet()
    .stream()
    .flatMap(entry ->
      entry
        .getValue()
        .stream()
        .filter(EslintHook::isEnabled) // Only enabled hooks
        .map(hook ->
          new EslintRule(
            hook.eslintKey(),
            hook.configurations(),
            hook.targets(),
            hook.analysisModes(),
            hook.blacklistedExtensions(),
            languageKey
          )
        )
    );

  return Stream.concat(eslintRules, eslintHooks).toList();
}
```

### 5. Sending to the Node.js Bridge

The analysis request is sent via WebSocket to the Node.js bridge:

```
JsTsSensor.analyzeFiles()
    └── Creates AnalyzeProjectHandler
    └── handler.getRequest() includes checks.enabledEslintRules()
            └── BridgeServerImpl.analyzeProject()
                    └── Serializes request to JSON
                    └── Sends via WebSocket: { type: "on-analyze-project", data: request }
```

The request includes:

- `files`: Map of files to analyze
- `rules`: List of `EslintRule` objects (includes hooks)
- `bundles`: Paths to deployed JavaScript bundles
- `rulesWorkdir`: Working directory for rules accessing the filesystem

### 6. Node.js Bridge Processing

On the JavaScript side (`packages/bridge/src/handle-request.ts`):

```typescript
case 'on-analyze-project': {
  const output = await analyzeProject(request.data, incrementalResultsChannel);
  return { type: 'success', result: output };
}
```

The `Linter` class (`packages/jsts/src/linter/linter.ts`) loads bundles dynamically:

```typescript
static async initialize({ bundles, ... }: InitializeParams) {
  for (const ruleBundle of bundles) {
    await Linter.loadRulesFromBundle(ruleBundle);
  }
}

private static async loadRulesFromBundle(ruleBundle: string) {
  const { rules: bundleRules } = await import(pathToFileURL(ruleBundle).toString());
  for (const rule of bundleRules) {
    Linter.rules[rule.ruleId] = rule.ruleModule;
  }
}
```

### 7. Rule Filtering During Linting

When linting a file, rules are filtered based on the `RuleConfig` properties:

```typescript
const rules = Linter.ruleConfigs?.filter(ruleConfig => {
  const { fileTypeTargets, analysisModes, language, blacklistedExtensions } = ruleConfig;
  return (
    fileTypeTargets.includes(fileType) &&
    analysisModes.includes(analysisMode) &&
    fileLanguage === language &&
    !(blacklistedExtensions || []).includes(extname(filePath))
  );
});
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JAVA SIDE (SonarQube)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐     ┌──────────────────────┐                      │
│  │  EslintHookRegistrar │     │     RulesBundle      │                      │
│  │   (your plugin)      │     │    (your plugin)     │                      │
│  └──────────┬───────────┘     └──────────┬───────────┘                      │
│             │                            │                                  │
│             │ @ScannerSide               │ @ScannerSide                     │
│             │ auto-discovery             │ auto-discovery                   │
│             ▼                            ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                      JsTsChecks                              │           │
│  │  - Calls registrar.register() to collect hooks               │           │
│  │  - enabledEslintRules() aggregates all rules + hooks         │           │
│  └──────────────────────────────────────────────────────────────┘           │
│             │                            │                                  │
│             │                            ▼                                  │
│             │              ┌─────────────────────────┐                      │
│             │              │     RulesBundles        │                      │
│             │              │  - Deploys .tgz files   │                      │
│             │              │  - Returns paths to JS  │                      │
│             │              └───────────┬─────────────┘                      │
│             │                          │                                    │
│             ▼                          ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                   BridgeServerImpl                           │           │
│  │  - Sends ProjectAnalysisRequest via WebSocket                │           │
│  │  - Request contains: rules[], bundles[], files{}             │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ WebSocket
                                    │ { type: "on-analyze-project", data: {...} }
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NODE.JS SIDE (Bridge)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                    handle-request.ts                         │           │
│  │  case 'on-analyze-project':                                  │           │
│  │    analyzeProject(request.data)                              │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                        Linter                                │           │
│  │  1. loadRulesFromBundle() - dynamic import of rules.js       │           │
│  │  2. getRulesForFile() - filters rules by file type/language  │           │
│  │  3. lint() - executes ESLint with configured rules           │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │              Your ESLint Rule (from bundle)                  │           │
│  │  - Receives parsed AST                                       │           │
│  │  - Executes analysis logic                                   │           │
│  │  - Can write data to rulesWorkdir                            │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Integration Points

| Component             | File                                                             | Purpose                                |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| `EslintHookRegistrar` | `sonar-plugin/api/.../EslintHookRegistrar.java`                  | Interface for hook registration        |
| `EslintHook`          | `sonar-plugin/api/.../EslintHook.java`                           | Hook descriptor interface              |
| `RulesBundle`         | `sonar-plugin/api/.../RulesBundle.java`                          | Interface for JS bundle location       |
| `JsTsChecks`          | `sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java:74-93` | Processes registrars, aggregates rules |
| `RulesBundles`        | `sonar-plugin/bridge/.../RulesBundles.java:70-91`                | Deploys JS bundles to filesystem       |
| `BridgeServerImpl`    | `sonar-plugin/bridge/.../BridgeServerImpl.java:422-429`          | Sends analysis request via WebSocket   |
| `handle-request.ts`   | `packages/bridge/src/handle-request.ts:66-70`                    | Receives and routes analysis request   |
| `Linter`              | `packages/jsts/src/linter/linter.ts:147-158`                     | Loads bundle rules dynamically         |
