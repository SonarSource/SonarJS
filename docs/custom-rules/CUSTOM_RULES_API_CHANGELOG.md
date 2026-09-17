# SonarJS Custom Rules API Changelog

This document tracks all changes to the SonarJS Custom Rules API that may impact external plugin developers.

## How to Update This Document

### Finding API Changes

```bash
# Find history of a specific API file
git log --oneline --all -- "**/api/**/FileName.java"

# Find the first release tag containing a commit
git tag --contains <commit-hash> --sort=version:refname | head -1

# Find the nearest release tag before the commit on its ancestry
git describe --tags --abbrev=0 <commit-hash>^

# View commit details
git show <commit-hash> --stat
```

### Key API Files to Track

- `sonar-plugin/api/src/main/java/org/sonar/plugins/javascript/api/`
  - `EslintHook.java` - Hook contract (10.23.0+); directly supported for
    `CustomRuleRepository` checks in 11.6.0+
  - `EslintHookRegistrar.java` - Hook registration (10.23.0+)
  - `ProfileRegistrar.java` - Default profile activation SPI (10.22.0+); named profile activation
    (12.2.0+)
  - `CustomRuleRepository.java` - Rule repository interface
  - `RulesBundle.java` - JS bundle interface
  - `Language.java` - Language enum (10.22.0+)

## API Changes Timeline

### Legend

| Symbol | Meaning          |
| ------ | ---------------- |
| ✅     | Added/Introduced |
| ⚠️     | Deprecated       |
| ❌     | Removed          |
| 🔄     | Changed/Modified |

---

### SonarJS 14.0.0 (unreleased)

| Change                        | Details                                                 | Commit |
| ----------------------------- | ------------------------------------------------------- | ------ |
| ❌ `Check` removed            | Implement `EslintHook` and provide `eslintKey()`        | —      |
| ❌ `EslintBasedCheck` removed | Implement `EslintHook` directly                         | —      |
| ❌ `JavaScriptCheck` removed  | Use `EslintHook` as the check contract                  | —      |
| ❌ `TestFileCheck` removed    | Implement `EslintHook` and target `InputFile.Type.TEST` | —      |

These types were deprecated for removal in 11.6.0 and are absent from the current
14.0.0-SNAPSHOT API. That API is not binary-compatible with plugin classes that reference them;
loading such a class can fail with `NoClassDefFoundError`. Plugins whose rule classes implement
`EslintHook` directly and whose classes and signatures do not otherwise reference a removed type
are unaffected by this API removal. SonarJS 14.0.0 has not been released yet.

**Migration from SonarJS 13.x**:

1. Change each legacy rule class to implement `EslintHook` directly and keep declaring it in
   `CustomRuleRepository.checkClasses()`.
2. Implement `eslintKey()` so it matches the rule ID exported by the JavaScript bundle. For a class
   that extended `Check`, returning the same constant used by `@Rule(key = ...)` preserves the
   former behavior.
3. For a class that extended `TestFileCheck`, override `targets()` and return
   `List.of(InputFile.Type.TEST)`.
4. Remove every import, superclass, interface, field, and method signature that refers to `Check`,
   `EslintBasedCheck`, `JavaScriptCheck`, or `TestFileCheck`. Compile against the oldest SonarJS API
   you intend to support (11.6.0 or later for direct repository rules), and test the resulting
   plugin with the current SonarJS 14.0.0-SNAPSHOT build or with SonarJS 14.0.0 once released.

One implementation using only the direct `EslintHook` contract can support SonarJS 11.6.0 and
later, subject to normal Java and platform compatibility. Supporting SonarJS 11.5.x or earlier
requires a separate legacy build, normally using `EslintBasedCheck`.

`CustomRuleRepository` remains supported. See [ESLINT_HOOKS.md](ESLINT_HOOKS.md) for the complete
current custom-rule API.

---

### SonarJS 12.2.0 (March 2026)

| Change                              | Details                                                 | Commit       |
| ----------------------------------- | ------------------------------------------------------- | ------------ |
| ✅ Named profile registration added | `registerQualityProfileRules(...)` on registrar context | `3eb58ad7ec` |

The earlier `registerDefaultQualityProfileRules(...)` shortcut remains available for the default
`Sonar way` profile. Use the named method only when the runtime contains SonarJS 12.2.0 or later.

---

### SonarJS 11.6.0 (November 2025)

| Change                                 | Details                                                            | Commit        |
| -------------------------------------- | ------------------------------------------------------------------ | ------------- |
| ⚠️ `EslintBasedCheck` deprecated       | Use `EslintHook` instead                                           | `9324ae345fc` |
| ⚠️ `JavaScriptCheck` deprecated        | Use `EslintHook` instead                                           | `9324ae345fc` |
| ⚠️ `Check` deprecated                  | Use `EslintHook` instead                                           | `9324ae345fc` |
| ⚠️ `TestFileCheck` deprecated          | Use `EslintHook` instead                                           | `9324ae345fc` |
| 🔄 `JsTsChecks` uses `EslintHook` type | `checkFactory.<EslintHook>create()` instead of `<JavaScriptCheck>` | `9324ae345fc` |

**Migration**: New repository checks may implement `EslintHook` directly from this release.
Existing `EslintBasedCheck`, `Check`, and `TestFileCheck` implementations still work in 11.6-13.x
but are deprecated; migrate them before upgrading to 14.0.

**Impact**: Plugins must implement `EslintHook` (directly or via `EslintBasedCheck`) for the CheckFactory cast to succeed.

---

### SonarJS 11.1.0 (July 2025)

| Change                                          | Details                                                 | Commit        |
| ----------------------------------------------- | ------------------------------------------------------- | ------------- |
| ❌ `CustomRuleRepository.languages()` removed   | Method and inner `Language` enum removed                | `0218b04b5ca` |
| ❌ `CustomRuleRepository.Language` enum removed | Use `org.sonar.plugins.javascript.api.Language` instead | `0218b04b5ca` |

**Breaking change**: Source code using `languages()` or `CustomRuleRepository.Language` no longer
compiles. In a previously compiled plugin, the old `languages()` override is no longer consulted;
the new `compatibleLanguages()` default selects JavaScript only, so TypeScript registration can be
lost. Resolving the removed inner enum can also fail at runtime.

**Migration**:

```java
// OLD (broken)
@Override
public Set<CustomRuleRepository.Language> languages() {
  return EnumSet.of(Language.JAVASCRIPT);
}

// NEW
@Override
public Set<org.sonar.plugins.javascript.api.Language> compatibleLanguages() {
  return EnumSet.of(org.sonar.plugins.javascript.api.Language.JAVASCRIPT);
}
```

---

### SonarJS 10.23.0 (May 2025)

| Change                                         | Details                                                                 | Commit        |
| ---------------------------------------------- | ----------------------------------------------------------------------- | ------------- |
| ✅ `EslintHook` interface added                | Contract for direct registrar hooks; `EslintBasedCheck` also extends it | `83ef267372c` |
| ✅ `EslintHookRegistrar` interface added       | Registers non-rule hooks that cannot raise issues                       | `83ef267372c` |
| 🔄 `EslintBasedCheck` now extends `EslintHook` | `EslintBasedCheck extends EslintHook, JavaScriptCheck`                  | `83ef267372c` |

In 10.23.0-11.5.x, direct registrar hooks use `EslintHook`, but issue-producing classes returned by
`CustomRuleRepository.checkClasses()` must implement `EslintBasedCheck`. The repository pipeline
filters out other implementations when it builds the ESLint rule set and issue mapping. Direct
`EslintHook` repository checks are supported from 11.6.0.

**Methods exposed by `EslintHook` in this release**:

- `eslintKey()` - Identify the ESLint rule to execute
- `configurations()` - Pass configuration to the ESLint rule
- `targets()` - Select main and test files
- `analysisModes()` - Control when hook runs (DEFAULT, SKIP_UNCHANGED)
- `blacklistedExtensions()` - Skip certain file extensions
- `isEnabled()` - Dynamically enable/disable hook

Only `isEnabled()` was a new capability in 10.23.0. The other methods had already appeared on the
legacy public check contract: `eslintKey()` and `configurations()` by 6.5.0, `targets()` by 8.5.0,
and `analysisModes()` and `blacklistedExtensions()` by 10.22.0.

---

### SonarJS 10.22.0 (April 2025)

| Change                                  | Details                                                            | Commit        |
| --------------------------------------- | ------------------------------------------------------------------ | ------------- |
| ✅ `Language` enum added (standalone)   | `org.sonar.plugins.javascript.api.Language`                        | `2f9168ca008` |
| ✅ `compatibleLanguages()` method added | New method in `CustomRuleRepository`                               | `2f9168ca008` |
| ✅ `ProfileRegistrar` interface added   | Register extra rule keys in built-in default profile (`Sonar way`) | `27e268aad12` |
| ⚠️ `languages()` method deprecated      | Use `compatibleLanguages()` instead                                | `2f9168ca008` |
| 🔄 `CustomRuleRepository` undeprecated  | Interface itself is no longer deprecated                           | `2f9168ca008` |

**Migration**: Start using `compatibleLanguages()` to prepare for 11.x.

---

### SonarJS 10.15.0 (September 2024)

| Change                          | Details                                                  | Commit        |
| ------------------------------- | -------------------------------------------------------- | ------------- |
| 🔄 API moved to separate module | `sonar-plugin/api` module created                        | `968bed25aeb` |
| ✅ `Check` class added          | Convenience implementation deriving its key from `@Rule` | `a9a8c41c26`  |

**Impact**: Dependency artifact changed.

```xml
<!-- OLD (before 10.15) -->
<dependency>
  <groupId>org.sonarsource.javascript</groupId>
  <artifactId>javascript-checks</artifactId>
</dependency>

<!-- NEW (10.15+) -->
<dependency>
  <groupId>org.sonarsource.javascript</groupId>
  <artifactId>api</artifactId>
  <scope>provided</scope>
</dependency>
```

---

### SonarJS 8.5.0 (October 2021)

| Change                         | Details                               | Commit       |
| ------------------------------ | ------------------------------------- | ------------ |
| ✅ `TestFileCheck` class added | Convenience base class for test rules | `6d5e398040` |

---

### SonarJS 6.5.0 (September 2020)

| Change                             | Details                                | Commit        |
| ---------------------------------- | -------------------------------------- | ------------- |
| ✅ Public `EslintBasedCheck` added | Public contract for ESLint-based rules | `4ee504ce23`  |
| ✅ `RulesBundle` interface added   | Provides custom ESLint rule bundles    | `18a8b1e9481` |

The similarly named class added in SonarJS 5.0 was internal; it was not the public custom-rule API.

---

### SonarJS 6.0.0 (October 2019)

| Change                               | Details                     | Commit        |
| ------------------------------------ | --------------------------- | ------------- |
| ⚠️ `CustomRuleRepository` deprecated | Entire interface deprecated | `175e1fef5e7` |

**Note**: This deprecation was later reversed in 10.22.0.

---

### SonarJS 4.2.0 (July 2018)

| Change                                    | Details                                    | Commit        |
| ----------------------------------------- | ------------------------------------------ | ------------- |
| ✅ `CustomRuleRepository` interface added | Replaced `CustomJavaScriptRulesDefinition` | `5be9a033e66` |

---

### SonarJS 2.6 (May 2015)

| Change                               | Details                              | Commit        |
| ------------------------------------ | ------------------------------------ | ------------- |
| ✅ `JavaScriptCheck` interface added | Base marker interface for all checks | `64437c38b04` |

---

## Interface Hierarchy Evolution

### Before 10.23.0

```
JavaScriptCheck (marker interface)
    └── EslintBasedCheck
            └── Your custom check
```

### 10.23.0 - 11.5.x

```
EslintHook (new base interface)
    │
    └── EslintBasedCheck (extends EslintHook, JavaScriptCheck)
            └── Your custom check (implements EslintBasedCheck)

JavaScriptCheck (marker retained; not sufficient by itself for an ESLint repository rule)
```

### 11.6.0 - 13.x

```
EslintHook
    └── Your custom check

EslintBasedCheck (deprecated, extends EslintHook and JavaScriptCheck)
    └── Legacy custom checks (still works)

JavaScriptCheck (deprecated, marker only)
```

### 14.0.0-SNAPSHOT (unreleased)

```
EslintHook
    └── Your custom check
```

---

## Compatibility Matrix

> **Note**: Community Edition and Server have different version numbers. See `SONARQUBE_VERSION_MATRIX.md` for details.

### By SonarJS Runtime Version

| Registration path                                                       | SonarJS 10.23-11.5.x                               | SonarJS 11.6-13.x | SonarJS 14.0.0-SNAPSHOT (unreleased) |
| ----------------------------------------------------------------------- | -------------------------------------------------- | ----------------- | ------------------------------------ |
| `EslintHook` via `EslintHookRegistrar` (non-rule hook)                  | ✅                                                 | ✅                | ✅                                   |
| `EslintHook` directly via `CustomRuleRepository` (issue-producing rule) | ❌ Repository pipeline requires `EslintBasedCheck` | ✅                | ✅                                   |
| `EslintBasedCheck` via `CustomRuleRepository`                           | ✅                                                 | ✅ (deprecated)   | ❌ Type removed                      |

**Key insight**: Through SonarJS 11.5.x, `JsTsChecks` creates `Checks<JavaScriptCheck>` and selects
only `EslintBasedCheck` instances for ESLint execution and issue mapping. SonarJS 11.6.0 switches
that pipeline to `EslintHook`.

- **SonarJS 10.23-11.5.x**: `EslintHookRegistrar` can register direct non-rule hooks, but repository
  rules must implement `EslintBasedCheck`.
- **SonarJS 11.6+**: Repository rules can implement `EslintHook` directly.
- **Current SonarJS 14.0.0-SNAPSHOT**: Plugins that reference a removed type must migrate and
  recompile. A separate legacy build is needed only when SonarJS 11.5.x or earlier must remain
  supported.

**Legend**: ✅ Works | ❌ Does not work

---

## Minimum Version Requirements

| Feature                                               | First SonarJS | First listed Community | First listed Server |
| ----------------------------------------------------- | ------------- | ---------------------- | ------------------- |
| `JavaScriptCheck`                                     | 2.6           | -                      | -                   |
| `CustomRuleRepository`                                | 4.2.0         | -                      | -                   |
| `EslintBasedCheck`                                    | 6.5.0         | -                      | -                   |
| `RulesBundle`                                         | 6.5.0         | -                      | -                   |
| `TestFileCheck`                                       | 8.5.0         | -                      | -                   |
| Separate `api` artifact                               | 10.15.0       | -                      | -                   |
| `Check`                                               | 10.15.0       | -                      | -                   |
| `compatibleLanguages()`                               | 10.22.0       | 25.5.0                 | 2025.3.0            |
| Default-profile `ProfileRegistrar` registration       | 10.22.0       | 25.5.0                 | 2025.3.0            |
| `EslintHook` contract / `EslintHookRegistrar`         | 10.23.0       | 25.6.0                 | 2025.3.0            |
| `languages()` removed                                 | 11.1.0        | 25.9.0                 | 2025.5.0            |
| Direct `EslintHook` checks via `CustomRuleRepository` | 11.6.0        | 25.12.0                | 2025.6.0            |
| Legacy check types deprecated                         | 11.6.0        | 25.12.0                | 2025.6.0            |
| Named-profile `ProfileRegistrar` registration         | 12.2.0        | Not mapped             | Not mapped          |
| Legacy check types removed                            | 14.0.0        | Not mapped             | Not mapped          |

---

## Migration Guides

### Migrating to SonarJS 14.0

The `api` artifact has been required since 10.15.0, and `compatibleLanguages()` since
`languages()` was removed in 11.1.0; neither the dependency coordinate nor the repository API
change is new in 14.0.

1. Change each legacy rule class to implement `EslintHook` directly and keep declaring it in
   `CustomRuleRepository.checkClasses()`.
2. Implement `eslintKey()` so it matches the rule ID exported by the JavaScript bundle. For a class
   that extended `Check`, return the same constant used by `@Rule(key = ...)`.
3. For a class that extended `TestFileCheck`, override `targets()` and return
   `List.of(InputFile.Type.TEST)`.
4. Remove every reference to `Check`, `EslintBasedCheck`, `JavaScriptCheck`, and `TestFileCheck`.
   Compile against the oldest SonarJS API you intend to support (11.6.0 or later for direct
   repository rules), and test the resulting plugin with the current SonarJS 14.0.0-SNAPSHOT build
   or with SonarJS 14.0.0 once released.

### Supporting Multiple SonarJS Versions

A plugin whose rule classes implement `EslintHook` directly and whose classes and signatures do not
reference a removed type can use the same check contract on SonarJS 11.6.0 and later, subject to
normal Java and platform compatibility. To support SonarJS 11.5.x or earlier, publish a separate
legacy build compiled against the older API, normally using `EslintBasedCheck`. Use
[SONARQUBE_VERSION_MATRIX.md](../SONARQUBE_VERSION_MATRIX.md) to identify the SonarJS version bundled
in a listed SonarQube release.
