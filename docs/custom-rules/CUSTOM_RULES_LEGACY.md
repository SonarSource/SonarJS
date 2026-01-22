# Custom Rules API (Legacy)

> **Deprecated since 11.6** - This API is deprecated and marked for removal. Use the [ESLint Hooks API](ESLINT_HOOKS.md) instead for new integrations.

This document describes the legacy approach for creating custom rules that integrate with SonarJS analysis.

## Overview

The legacy Custom Rules API allows external plugins to define rules that:

- Are **associated with Sonar rule keys** via `@Rule` annotation
- **Raise Sonar issues** during analysis
- Are **activated through quality profiles**
- Require **separate repositories** for JavaScript and TypeScript

## When to Use

This API should only be used for maintaining existing integrations. For new projects, use the [ESLint Hooks API](ESLINT_HOOKS.md).

## Components

A complete legacy custom rules integration requires:

1. **Check Classes** - implement `EslintBasedCheck` or extend `Check`
2. **Rule Repository** - implements `CustomRuleRepository`
3. **Rules Bundle** - packages the ESLint-side JavaScript code
4. **Rules Definition** - defines rule metadata for SonarQube
5. **Plugin Class** - registers all components

## Implementation Guide

### 1. Create Check Classes

Each rule requires a Java class with the `@Rule` annotation:

```java
package com.example.plugin.rules;

import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.Check;

@Rule(key = "S1234")
public class MyCustomCheck extends Check {
  // The Check base class provides eslintKey() from @Rule annotation
}
```

For rules that need custom configuration:

```java
package com.example.plugin.rules;

import java.util.List;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@Rule(key = "S5678")
@JavaScriptRule // Enable for JavaScript
@TypeScriptRule // Enable for TypeScript
public class MyAdvancedCheck implements EslintBasedCheck {

  @Override
  public String eslintKey() {
    // Must match the rule name in your ESLint plugin
    return "my-advanced-rule";
  }

  @Override
  public List<Object> configurations() {
    // Optional configuration passed to the ESLint rule
    return List.of();
  }

  @Override
  public List<AnalysisMode> analysisModes() {
    return List.of(AnalysisMode.DEFAULT, AnalysisMode.SKIP_UNCHANGED);
  }

  @Override
  public List<String> blacklistedExtensions() {
    return List.of(".htm", ".html");
  }
}
```

For rules targeting test files only:

```java
package com.example.plugin.rules;

import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.TestFileCheck;

@Rule(key = "S9999")
public class MyTestOnlyCheck extends TestFileCheck {
  // Automatically targets InputFile.Type.TEST
}
```

### 2. Create an Abstract Base Class (Optional)

For multiple rules sharing common configuration:

```java
package com.example.plugin.rules;

import java.util.List;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@JavaScriptRule
@TypeScriptRule
public abstract class AbstractSecurityCheck implements EslintBasedCheck {

  @Override
  public String eslintKey() {
    return "security-analyzer"; // Shared ESLint rule
  }

  @Override
  public List<AnalysisMode> analysisModes() {
    return List.of(AnalysisMode.DEFAULT, AnalysisMode.SKIP_UNCHANGED);
  }

  @Override
  public List<String> blacklistedExtensions() {
    return List.of(".htm", ".html");
  }
}
```

```java
package com.example.plugin.rules;

import org.sonar.check.Rule;

@Rule(key = "S3649")
public class SQLInjectionCheck extends AbstractSecurityCheck {
  // Inherits all configuration from AbstractSecurityCheck
}

@Rule(key = "S5131")
public class XSSCheck extends AbstractSecurityCheck {
  // Inherits all configuration from AbstractSecurityCheck
}
```

### 3. Create the Rules List

```java
package com.example.plugin;

import com.example.plugin.rules.*;
import java.util.List;

public class RulesList {

  public static List<Class<?>> allRules() {
    return List.of(
      MyCustomCheck.class,
      MyAdvancedCheck.class,
      SQLInjectionCheck.class,
      XSSCheck.class
    );
  }

  public static List<Class<?>> jsRules() {
    // Return rules applicable to JavaScript
    return allRules();
  }

  public static List<Class<?>> tsRules() {
    // Return rules applicable to TypeScript
    return allRules();
  }
}
```

### 4. Create the Rule Repositories

You need **separate repositories** for JavaScript and TypeScript:

```java
package com.example.plugin;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.Language;

public class JsRuleRepository implements CustomRuleRepository {

  public static final String REPOSITORY_KEY = "my-js-rules";

  @Override
  public Set<Language> compatibleLanguages() {
    return EnumSet.of(Language.JAVASCRIPT);
  }

  @Override
  public String repositoryKey() {
    return REPOSITORY_KEY;
  }

  @Override
  public List<?> checkClasses() {
    return RulesList.jsRules();
  }
}
```

```java
package com.example.plugin;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.Language;

public class TsRuleRepository implements CustomRuleRepository {

  public static final String REPOSITORY_KEY = "my-ts-rules";

  @Override
  public Set<Language> compatibleLanguages() {
    return EnumSet.of(Language.TYPESCRIPT);
  }

  @Override
  public String repositoryKey() {
    return REPOSITORY_KEY;
  }

  @Override
  public List<?> checkClasses() {
    return RulesList.tsRules();
  }
}
```

### 5. Create the Rules Bundle

```java
package com.example.plugin;

import org.sonar.plugins.javascript.api.RulesBundle;

public class MyRulesBundle implements RulesBundle {

  @Override
  public String bundlePath() {
    return "/my-eslint-rules-1.0.0.tgz";
  }
}
```

### 6. Create the Rules Definition

Define rule metadata for SonarQube:

```java
package com.example.plugin;

import org.sonar.api.server.rule.RulesDefinition;

public class MyRulesDefinition implements RulesDefinition {

  @Override
  public void define(Context context) {
    defineJsRules(context);
    defineTsRules(context);
  }

  private void defineJsRules(Context context) {
    NewRepository repository = context
      .createRepository(JsRuleRepository.REPOSITORY_KEY, "js")
      .setName("My JavaScript Rules");

    // Define each rule
    repository
      .createRule("S1234")
      .setName("My Custom Rule")
      .setHtmlDescription("<p>Description of the rule</p>")
      .setSeverity("MAJOR")
      .setType(RuleType.CODE_SMELL);

    repository.done();
  }

  private void defineTsRules(Context context) {
    NewRepository repository = context
      .createRepository(TsRuleRepository.REPOSITORY_KEY, "ts")
      .setName("My TypeScript Rules");

    // Define rules for TypeScript...

    repository.done();
  }
}
```

### 7. Create the ESLint Plugin (JavaScript)

```javascript
// src/rules/my-custom-rule.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'My custom rule description',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isViolation(node)) {
          context.report({
            node,
            message: 'This is a violation',
          });
        }
      },
    };
  },
};

function isViolation(node) {
  // Your detection logic
  return false;
}
```

```javascript
// index.js
module.exports = {
  rules: {
    'my-custom-rule': require('./rules/my-custom-rule'),
    'my-advanced-rule': require('./rules/my-advanced-rule'),
    'security-analyzer': require('./rules/security-analyzer'),
  },
};
```

### 8. Create the Plugin Class

```java
package com.example.plugin;

import org.sonar.api.Plugin;

public class MyCustomRulesPlugin implements Plugin {

  @Override
  public void define(Context context) {
    context.addExtensions(
      // Rules bundle
      MyRulesBundle.class,
      // Rule repositories
      JsRuleRepository.class,
      TsRuleRepository.class,
      // Rules definition
      MyRulesDefinition.class
    );
  }
}
```

### 9. Configure Maven Dependencies

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

See the integration test plugin in SonarJS for a complete working example:

- `its/plugin/plugins/eslint-custom-rules-plugin-legacy/`

## Deprecated Classes Reference

| Class/Interface    | Status     | Replacement                          |
| ------------------ | ---------- | ------------------------------------ |
| `JavaScriptCheck`  | Deprecated | `EslintHook`                         |
| `EslintBasedCheck` | Deprecated | `EslintHook`                         |
| `Check`            | Deprecated | `EslintHook`                         |
| `TestFileCheck`    | Deprecated | `EslintHook` with custom `targets()` |

## Migration to ESLint Hooks

To migrate from this API to ESLint Hooks:

1. Replace `EslintBasedCheck` implementations with `EslintHook`
2. Replace `CustomRuleRepository` with `EslintHookRegistrar`
3. Remove `@Rule` annotations (hooks don't raise issues directly)
4. Use `register()` to register for multiple languages in one class

See [ESLINT_HOOKS.md](ESLINT_HOOKS.md) for the new API documentation.

## Technical Details: How Legacy Custom Rules Are Integrated

This section explains how the legacy Custom Rules API is wired into the SonarJS analysis pipeline.

### 1. Discovery via SonarQube Dependency Injection

The `CustomRuleRepository` interface is annotated with `@ScannerSide` and `@SonarLintSide`:

```java
@ScannerSide
@SonarLintSide
public interface CustomRuleRepository {
  Set<Language> compatibleLanguages();
  String repositoryKey();
  List<?> checkClasses();
}
```

When your plugin is loaded, SonarQube automatically:

1. Discovers all `CustomRuleRepository` implementations
2. Instantiates them via reflection
3. Injects them as an array into `JsTsChecks`

### 2. Processing in JsTsChecks

The `JsTsChecks` class (`sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java`) receives all `CustomRuleRepository` implementations:

```java
public JsTsChecks(
  CheckFactory checkFactory,
  @Nullable CustomRuleRepository[] customRuleRepositories,
  @Nullable EslintHookRegistrar[] eslintHookRegistrars
) {
  // ...
  // Add built-in checks
  doAddChecks(Language.TYPESCRIPT, CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
  addCustomChecks(Language.TYPESCRIPT);  // <-- Custom rules added here

  doAddChecks(Language.JAVASCRIPT, CheckList.JS_REPOSITORY_KEY, CheckList.getJavaScriptChecks());
  addCustomChecks(Language.JAVASCRIPT);  // <-- Custom rules added here
}

private void addCustomChecks(Language language) {
  for (CustomRuleRepository repo : customRuleRepositories) {
    if (repo.compatibleLanguages().contains(language)) {
      doAddChecks(language, repo.repositoryKey(), repo.checkClasses());
    }
  }
}
```

### 3. CheckFactory: The Heart of Quality Profile Filtering

`CheckFactory` is a **SonarQube-provided component** (`org.sonar.api.batch.rule.CheckFactory`) that bridges the gap between:

- **SonarJS**: Knows what rule classes exist (compiled into the plugin)
- **SonarQube**: Knows which rules are active (configured by users in quality profiles)

When the scanner starts, SonarQube injects a `CheckFactory` instance that is **pre-loaded with the active quality profile data**.

#### Input: All Rule Classes (No Filtering)

`CheckList.getJavaScriptChecks()` returns **ALL** rule classes - it's a static list with no knowledge of quality profiles:

```java
// AllChecks.java (auto-generated, ~300+ rules)
protected static final List<Class<? extends EslintHook>> rules = Arrays.asList(
  S100.class,
  S101.class,
  S103.class,
  // ... 300+ rule classes
);
```

#### CheckFactory Filters by Quality Profile

The `doAddChecks()` method uses `CheckFactory` to filter and instantiate only active rules:

```java
private void doAddChecks(Language language, String repositoryKey, Iterable<?> checkClasses) {
  // checkClasses contains ALL rule classes (300+)
  // chks will contain only ACTIVE rule instances (e.g., 50-100)
  var chks = checkFactory.<EslintHook>create(repositoryKey).addAnnotatedChecks(checkClasses);

  var key = new LanguageAndRepository(language, repositoryKey);
  this.checks.put(key, chks);

  // Build the eslintKey → RuleKey mapping for active rules only
  chks
    .all()
    .forEach(check ->
      eslintKeyToRuleKey
        .computeIfAbsent(check.eslintKey(), k -> new EnumMap<>(Language.class))
        .put(language, chks.ruleKey(check))
    );
}
```

**What `CheckFactory.create(repositoryKey).addAnnotatedChecks(checkClasses)` does:**

1. Takes all check classes you pass in (e.g., 300+ rules)
2. Reads the `@Rule(key = "...")` annotation from each class
3. **Checks the quality profile**: Is this rule active?
4. **Only instantiates active rules**: Skips inactive ones entirely
5. Returns `Checks<EslintHook>` containing only the active check instances

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SonarQube Server                                    │
│  Quality Profile "Sonar Way":  S100 ✓, S101 ✗, S102 ✓, S103 ✗ ...          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Scanner downloads QP
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CheckFactory (injected by SonarQube, knows which rules are active)         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Input: CheckList.getJavaScriptChecks()                                     │
│         [S100.class, S101.class, S102.class, S103.class, ... 300+ classes]  │
│                                                                             │
│                    checkFactory.create("javascript")                        │
│                        .addAnnotatedChecks(checkClasses)                    │
│                                    │                                        │
│                                    ▼                                        │
│  Output: Checks<EslintHook>                                                 │
│          [S100 instance, S102 instance]  ← Only 2 active rules              │
│          (S101, S103 skipped - not active in QP)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why This Separation?

| Component                 | Source               | Knows Rules          | Knows Quality Profile |
| ------------------------- | -------------------- | -------------------- | --------------------- |
| `CheckList` / `AllChecks` | SonarJS (static)     | ✅ All rule classes  | ❌ No                 |
| `CheckFactory`            | SonarQube (injected) | ❌ No                | ✅ Yes (pre-loaded)   |
| `Checks<T>`               | Result of filtering  | ✅ Active rules only | N/A                   |

This is a key difference from `EslintHookRegistrar`: custom rules are only executed if they are activated in the quality profile, while hooks bypass `CheckFactory` entirely and always execute when `isEnabled()` returns true.

### 4. The Three Purposes of JsTsChecks

`JsTsChecks` serves three distinct purposes during the analysis lifecycle:

#### 4.1. Building the Mapping Table (Constructor)

When `JsTsChecks` is instantiated, `doAddChecks()` builds the `eslintKeyToRuleKey` map:

```java
// Maps: eslintKey → (Language → RuleKey)
private final Map<String, Map<Language, RuleKey>> eslintKeyToRuleKey = new HashMap<>();
```

This map is populated only with **active rules** (filtered by `CheckFactory`).

#### 4.2. Providing Rules to the Bridge (`enabledEslintRules()`)

Called by `JsTsSensor` when building the analysis request:

```java
// JsTsSensor.AnalyzeProjectHandler.getRequest()
return new BridgeServer.ProjectAnalysisRequest(
  files,
  checks.enabledEslintRules(),  // ← Returns rules to send to bridge
  configuration
);
```

This returns the list of `EslintRule` objects to send to the Node.js bridge. Only active rules are included because the `checks` map only contains active rules.

#### 4.3. Converting Issues Back (`ruleKeyByEslintKey()`)

Called by `AnalysisProcessor` when processing issues returned from the bridge:

```java
// AnalysisProcessor.findRuleKey()
private RuleKey findRuleKey(Issue issue) {
  return checks.ruleKeyByEslintKey(issue.ruleId(), Language.of(issue.language()));
}
```

This looks up the Sonar `RuleKey` for an ESLint issue using the mapping built in step 4.1.

### 5. Complete Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JsTsChecks CONSTRUCTOR                              │
│                                                                             │
│  CheckList.getJavaScriptChecks() ──┐                                        │
│  CheckList.getTypeScriptChecks() ──┼──► doAddChecks()                       │
│  CustomRuleRepository.checkClasses()┘        │                              │
│                                              ▼                              │
│                              CheckFactory (filters by QP)                   │
│                                              │                              │
│                                              ▼                              │
│                    ┌─────────────────────────────────────────┐              │
│                    │  checks: Map<LanguageAndRepo, Checks>   │              │
│                    │  eslintKeyToRuleKey: Map<eslintKey,     │              │
│                    │                      Map<Language,      │              │
│                    │                          RuleKey>>      │              │
│                    └─────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ enabledEslintRules()  │  │ ruleKeyByEslintKey()   │  │ parsingErrorRuleKey()  │
│                       │  │                        │  │                        │
│ Returns List of       │  │ Looks up Sonar         │  │ Returns RuleKey for    │
│ EslintRule to send    │  │ RuleKey from           │  │ parsing errors (S2260) │
│ to bridge             │  │ eslintKey              │  │                        │
└───────────┬───────────┘  └───────────┬────────────┘  └────────────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────┐  ┌────────────────────────┐
│ JsTsSensor            │  │ AnalysisProcessor      │
│ .getRequest()         │  │ .findRuleKey()         │
│                       │  │                        │
│ Sends rules to        │  │ Converts ESLint        │
│ Node.js bridge        │  │ issues to Sonar        │
│                       │  │ issues                 │
└───────────────────────┘  └────────────────────────┘
```

### 6. Issue Transformation Details

When the bridge returns an issue, `AnalysisProcessor` converts it to a Sonar issue:

```java
// AnalysisProcessor.saveIssue()
var ruleKey = findRuleKey(issue);  // Calls checks.ruleKeyByEslintKey()
if (ruleKey != null) {
  newIssue.at(location).forRule(ruleKey).save();
}
// If ruleKey is null, the issue is silently discarded
```

This is why hooks cannot raise issues: their `eslintKey` is not in the `eslintKeyToRuleKey` map, so `ruleKeyByEslintKey()` returns `null` and the issue is discarded.

### 6. Bundle Deployment (Same as Hooks API)

The `RulesBundle` mechanism works identically for both APIs:

```java
// RulesBundles.java
public List<Path> deploy(Path target) {
  // 1. Extract .tgz from plugin JAR
  // 2. Return path to package/dist/rules.js
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JAVA SIDE (SonarQube)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐     ┌──────────────────────┐                      │
│  │  CustomRuleRepository│     │     RulesBundle      │                      │
│  │   (your plugin)      │     │    (your plugin)     │                      │
│  │                      │     │                      │                      │
│  │  - repositoryKey()   │     │  - bundlePath()      │                      │
│  │  - checkClasses()    │     │                      │                      │
│  │  - compatibleLangs() │     │                      │                      │
│  └──────────┬───────────┘     └──────────┬───────────┘                      │
│             │                            │                                  │
│             │ @ScannerSide               │ @ScannerSide                     │
│             │ auto-discovery             │ auto-discovery                   │
│             ▼                            │                                  │
│  ┌──────────────────────┐                │                                  │
│  │     CheckFactory     │                │                                  │
│  │  - Reads @Rule       │                │                                  │
│  │  - Filters by QP     │◄── Quality Profile (only active rules)            │
│  │  - Instantiates      │                │                                  │
│  └──────────┬───────────┘                │                                  │
│             │                            │                                  │
│             ▼                            ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                      JsTsChecks                              │           │
│  │  - addCustomChecks() processes each CustomRuleRepository     │           │
│  │  - Maps: eslintKey() <-> @Rule(key) for issue conversion     │           │
│  │  - enabledEslintRules() aggregates all active rules          │           │
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
│  │  - context.report() raises issues                            │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                   Issue Transformation                       │           │
│  │  - ESLint messages converted to Sonar issues                 │           │
│  │  - eslintKey mapped back to Sonar rule key                   │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Differences from ESLint Hooks API

| Aspect                    | Legacy Custom Rules                           | ESLint Hooks                        |
| ------------------------- | --------------------------------------------- | ----------------------------------- |
| **Activation**            | Only if active in quality profile             | Always (when `isEnabled()` is true) |
| **Rule keys**             | Has Sonar rule key via `@Rule`                | No rule key association             |
| **Issues**                | Can raise Sonar issues via `context.report()` | Cannot raise issues directly        |
| **Language registration** | Separate repository per language              | Single registrar for all languages  |
| **Discovery**             | `CustomRuleRepository.checkClasses()`         | `EslintHookRegistrar.register()`    |

### Key Integration Points

| Component                      | File                                                               | Purpose                              |
| ------------------------------ | ------------------------------------------------------------------ | ------------------------------------ |
| `CustomRuleRepository`         | `sonar-plugin/api/.../CustomRuleRepository.java`                   | Interface for rule repositories      |
| `EslintBasedCheck`             | `sonar-plugin/api/.../EslintBasedCheck.java`                       | Deprecated check interface           |
| `Check`                        | `sonar-plugin/api/.../Check.java`                                  | Deprecated base class                |
| `JsTsChecks.addCustomChecks()` | `sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java:110-116` | Processes custom repositories        |
| `JsTsChecks.doAddChecks()`     | `sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java:95-108`  | Instantiates checks via CheckFactory |
| `JsTsChecks.ruleKey()`         | `sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java`         | Maps eslintKey to Sonar RuleKey      |
| `RulesBundles`                 | `sonar-plugin/bridge/.../RulesBundles.java`                        | Deploys JS bundles                   |
| `Linter`                       | `packages/jsts/src/linter/linter.ts`                               | Loads and executes rules             |
