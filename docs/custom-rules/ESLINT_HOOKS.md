# EslintHook API (Recommended)

This document describes the recommended approach for creating custom rules that integrate with SonarJS analysis using the `EslintHook` interface.

## Overview

The `EslintHook` interface is the modern way to define custom rules in SonarJS. Rules implementing this interface:

- **Can raise Sonar issues** when registered via `CustomRuleRepository`
- **Are activated through quality profiles** - only run when enabled by users
- **Provide full control** over analysis modes, file types, and configurations

## Components

A complete custom rules integration requires:

1. **Check Classes** - implement `EslintHook`
2. **Rule Repository** - implements `CustomRuleRepository`
3. **Rules Bundle** - packages the ESLint-side JavaScript code
4. **Rules Definition** - defines rule metadata for SonarQube
5. **Plugin Class** - registers all components

## Implementation Guide

### 1. Create Check Classes

Each rule requires a Java class with the `@Rule` annotation that implements `EslintHook`:

```java
package com.example.plugin.rules;

import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.EslintHook;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@Rule(key = "S1234")
@JavaScriptRule // Enable for JavaScript
@TypeScriptRule // Enable for TypeScript
public class MyCustomCheck implements EslintHook {

  @Override
  public String eslintKey() {
    // Must match the rule name exported by your ESLint plugin
    return "my-custom-rule";
  }

  @Override
  public List<InputFile.Type> targets() {
    // Which file types to analyze (default: MAIN only)
    return List.of(InputFile.Type.MAIN);
  }

  @Override
  public List<AnalysisMode> analysisModes() {
    // When to run the rule
    return List.of(AnalysisMode.DEFAULT, AnalysisMode.SKIP_UNCHANGED);
  }

  @Override
  public List<String> blacklistedExtensions() {
    // File extensions to skip
    return List.of(".htm", ".html");
  }

  @Override
  public boolean isEnabled() {
    // Conditionally enable/disable the rule
    return true;
  }

  @Override
  public List<Object> configurations() {
    // Optional configuration passed to the ESLint rule
    return List.of();
  }
}
```

For rules targeting test files:

```java
@Rule(key = "S9999")
@JavaScriptRule
@TypeScriptRule
public class MyTestOnlyCheck implements EslintHook {

  @Override
  public String eslintKey() {
    return "my-test-rule";
  }

  @Override
  public List<InputFile.Type> targets() {
    return List.of(InputFile.Type.TEST);
  }
}
```

### 2. Create the Rules List

```java
package com.example.plugin;

import com.example.plugin.rules.*;
import java.util.List;

public class RulesList {

  public static List<Class<?>> allRules() {
    return List.of(MyCustomCheck.class, MyTestOnlyCheck.class);
  }
}
```

### 3. Create the Rule Repository

Register your rules with SonarJS via `CustomRuleRepository`:

```java
package com.example.plugin;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.Language;

public class MyRuleRepository implements CustomRuleRepository {

  public static final String REPOSITORY_KEY = "my-custom-rules";

  @Override
  public Set<Language> compatibleLanguages() {
    // Register for both JavaScript and TypeScript
    return EnumSet.of(Language.JAVASCRIPT, Language.TYPESCRIPT);
  }

  @Override
  public String repositoryKey() {
    return REPOSITORY_KEY;
  }

  @Override
  public List<?> checkClasses() {
    return RulesList.allRules();
  }
}
```

### 4. Create the Rules Bundle

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

### 5. Create the ESLint Plugin (JavaScript)

Create an ESLint plugin that exports your rules:

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
    'my-test-rule': require('./rules/my-test-rule'),
  },
};
```

Bundle your plugin as a `.tgz` file and include it in your JAR resources.

### 6. Create the Rules Definition

Define rule metadata for SonarQube:

```java
package com.example.plugin;

import org.sonar.api.server.rule.RulesDefinition;

public class MyRulesDefinition implements RulesDefinition {

  @Override
  public void define(Context context) {
    NewRepository repository = context
      .createRepository(MyRuleRepository.REPOSITORY_KEY, "js")
      .setName("My Custom Rules");

    // Define each rule
    repository
      .createRule("S1234")
      .setName("My Custom Rule")
      .setHtmlDescription("<p>Description of the rule</p>")
      .setSeverity("MAJOR")
      .setType(RuleType.CODE_SMELL);

    repository.done();
  }
}
```

### 7. Create the Plugin Class

```java
package com.example.plugin;

import org.sonar.api.Plugin;

public class MyCustomRulesPlugin implements Plugin {

  @Override
  public void define(Context context) {
    context.addExtensions(
      // Rules bundle
      MyRulesBundle.class,
      // Rule repository
      MyRuleRepository.class,
      // Rules definition
      MyRulesDefinition.class
    );
  }
}
```

### 8. Configure Maven Dependencies

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

## API Reference

### EslintHook Interface

| Method                    | Description                           | Default      |
| ------------------------- | ------------------------------------- | ------------ |
| `eslintKey()`             | ESLint rule name to execute           | Required     |
| `configurations()`        | Configuration passed to the rule      | Empty list   |
| `targets()`               | File types to analyze (MAIN, TEST)    | MAIN only    |
| `analysisModes()`         | When to run (DEFAULT, SKIP_UNCHANGED) | DEFAULT only |
| `blacklistedExtensions()` | Extensions to skip                    | Empty list   |
| `isEnabled()`             | Whether the rule should run           | `true`       |

### CustomRuleRepository Interface

| Method                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `repositoryKey()`       | Unique identifier for your rule repository    |
| `checkClasses()`        | List of check classes implementing EslintHook |
| `compatibleLanguages()` | Languages this repository supports (JS/TS)    |

## Best Practices

1. **Use `@JavaScriptRule` and `@TypeScriptRule` annotations** - These control which languages your rule applies to.

2. **Handle analysis modes appropriately** - If your rule supports incremental analysis, include `AnalysisMode.SKIP_UNCHANGED`.

3. **Blacklist unsupported file types** - Use `blacklistedExtensions()` to skip files that your analysis doesn't support (e.g., HTML files for module-resolution-dependent analysis).

4. **Use `isEnabled()` for conditional execution** - Check configuration or context to determine if the rule should run.

## Complete Example

See the integration test plugin in SonarJS for a complete working example:

- `its/plugin/plugins/eslint-custom-rules-plugin/`

---

## Advanced: Data Collection Hooks (EslintHookRegistrar)

> **Note:** This section describes an advanced use case. Most users should use `CustomRuleRepository` as shown above.

If you need to execute custom logic during analysis **without raising Sonar issues**, you can use `EslintHookRegistrar`. This is useful for:

- Collecting data across multiple files for later analysis
- Generating intermediate representations (IR) for external tools
- Integrating with external analysis tools
- Executing logic that doesn't map directly to Sonar rules

### Key Differences

| Aspect                | CustomRuleRepository (above)     | EslintHookRegistrar (this section) |
| --------------------- | -------------------------------- | ---------------------------------- |
| **Can raise issues**  | ✅ Yes                           | ❌ No                              |
| **Quality profile**   | Filtered by QP (only active run) | Always runs when `isEnabled()`     |
| **Rule key required** | Yes (`@Rule` annotation)         | No                                 |
| **Use case**          | Custom Sonar rules               | Data collection, external tools    |

### Implementation

```java
package com.example.plugin;

import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.EslintHook;
import org.sonar.plugins.javascript.api.EslintHookRegistrar;
import org.sonar.plugins.javascript.api.Language;

public class MyDataCollectionHook implements EslintHook, EslintHookRegistrar {

  @Override
  public String eslintKey() {
    return "my-data-collector";
  }

  @Override
  public List<InputFile.Type> targets() {
    return List.of(InputFile.Type.MAIN, InputFile.Type.TEST);
  }

  @Override
  public List<AnalysisMode> analysisModes() {
    return List.of(AnalysisMode.DEFAULT);
  }

  @Override
  public void register(RegistrarContext registrarContext) {
    // Register for JavaScript and/or TypeScript analysis
    registrarContext.registerEslintHook(Language.JAVASCRIPT, this);
    registrarContext.registerEslintHook(Language.TYPESCRIPT, this);
  }
}
```

Register only the hook and bundle (no `CustomRuleRepository`):

```java
public class MyPlugin implements Plugin {

  @Override
  public void define(Context context) {
    context.addExtensions(MyRulesBundle.class, MyDataCollectionHook.class);
  }
}
```

### Why Hooks Cannot Raise Issues

Hooks registered via `EslintHookRegistrar` bypass `CheckFactory` entirely. They are stored directly without building the `eslintKey → RuleKey` mapping that's required for issue conversion. When the bridge returns issues, `ruleKeyByEslintKey()` won't find a mapping for hook eslintKeys, so issues are silently discarded.

```
CustomRuleRepository path:
  checkClasses → CheckFactory → filters by QP → eslintKeyToRuleKey map
                                                     ↓
                                              Can raise issues ✓

EslintHookRegistrar path:
  register() → directly stored → NO eslintKeyToRuleKey mapping
                                        ↓
                                 Cannot raise issues ✗
```

### Example: sonar-architecture

See the [sonar-architecture](https://github.com/SonarSource/sonar-architecture) repository for a complete working example of data collection hooks:

- `ArchitectureJsEslintHook.java` - Hook implementation
- `ArchitectureJsRulesBundle.java` - Bundle configuration
- `ArchitectureJsFrontendPlugin.java` - Plugin registration

---

## Technical Details: How Custom Rules Are Integrated

This section explains how the Custom Rules API is wired into the SonarJS analysis pipeline.

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

The `JsTsChecks` class receives all `CustomRuleRepository` implementations:

```java
public JsTsChecks(
  CheckFactory checkFactory,
  @Nullable CustomRuleRepository[] customRuleRepositories,
  @Nullable EslintHookRegistrar[] eslintHookRegistrars
) {
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

### 3. CheckFactory: Quality Profile Filtering

`CheckFactory` is a SonarQube-provided component that filters rules by the active quality profile:

```java
private void doAddChecks(Language language, String repositoryKey, Iterable<?> checkClasses) {
  // checkClasses contains ALL rule classes
  // chks will contain only ACTIVE rule instances (filtered by quality profile)
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

1. Takes all check classes you pass in
2. Reads the `@Rule(key = "...")` annotation from each class
3. Checks the quality profile: Is this rule active?
4. Only instantiates active rules (skips inactive ones)
5. Returns `Checks<EslintHook>` containing only the active check instances

### 4. Issue Transformation

When the bridge returns an issue, `AnalysisProcessor` converts it to a Sonar issue:

```java
var ruleKey = checks.ruleKeyByEslintKey(issue.ruleId(), language);
if (ruleKey != null) {
  newIssue.at(location).forRule(ruleKey).save();
}
// If ruleKey is null, the issue is silently discarded
```

This is why `CustomRuleRepository` rules can raise issues: their `eslintKey` is in the `eslintKeyToRuleKey` map.

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

### Key Integration Points

| Component                      | File                                                       | Purpose                              |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------ |
| `EslintHook`                   | `sonar-plugin/api/.../EslintHook.java`                     | Rule interface                       |
| `CustomRuleRepository`         | `sonar-plugin/api/.../CustomRuleRepository.java`           | Interface for rule repositories      |
| `RulesBundle`                  | `sonar-plugin/api/.../RulesBundle.java`                    | Interface for JS bundle location     |
| `JsTsChecks.addCustomChecks()` | `sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java` | Processes custom repositories        |
| `JsTsChecks.doAddChecks()`     | `sonar-plugin/sonar-javascript-plugin/.../JsTsChecks.java` | Instantiates checks via CheckFactory |
| `RulesBundles`                 | `sonar-plugin/bridge/.../RulesBundles.java`                | Deploys JS bundles                   |
| `Linter`                       | `packages/jsts/src/linter/linter.ts`                       | Loads and executes rules             |
