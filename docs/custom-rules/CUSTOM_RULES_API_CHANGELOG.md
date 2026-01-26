# SonarJS Custom Rules API Changelog

This document tracks all changes to the SonarJS Custom Rules API that may impact external plugin developers.

## How to Update This Document

### Finding API Changes

```bash
# Find history of a specific API file
git log --oneline --all -- "**/api/**/FileName.java"

# Find which version introduced a commit
git tag --contains <commit-hash> | head -3

# Find which version does NOT have a commit (last version before change)
git tag --no-contains <commit-hash> | tail -3

# View commit details
git show <commit-hash> --stat
```

### Key API Files to Track

- `sonar-plugin/api/src/main/java/org/sonar/plugins/javascript/api/`
  - `EslintHook.java` - New hook interface (10.23.0+)
  - `EslintHookRegistrar.java` - Hook registration (10.23.0+)
  - `EslintBasedCheck.java` - Check interface (deprecated 11.6.0)
  - `JavaScriptCheck.java` - Marker interface (deprecated 11.6.0)
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

### SonarJS 11.6.0 (November 2025)

| Change                                 | Details                                                            | Commit        |
| -------------------------------------- | ------------------------------------------------------------------ | ------------- |
| ⚠️ `EslintBasedCheck` deprecated       | Use `EslintHook` instead                                           | `9324ae345fc` |
| ⚠️ `JavaScriptCheck` deprecated        | Use `EslintHook` instead                                           | `9324ae345fc` |
| ⚠️ `TypeScriptCheck` deprecated        | Use `EslintHook` instead                                           | `9324ae345fc` |
| ⚠️ `TestFileCheck` deprecated          | Use `EslintHook` instead                                           | `9324ae345fc` |
| 🔄 `JsTsChecks` uses `EslintHook` type | `checkFactory.<EslintHook>create()` instead of `<JavaScriptCheck>` | `9324ae345fc` |

**Migration**: Replace `implements EslintBasedCheck` with `implements EslintHook`.

**Impact**: Plugins must implement `EslintHook` (directly or via `EslintBasedCheck`) for the CheckFactory cast to succeed.

---

### SonarJS 11.1.0 (July 2025)

| Change                                          | Details                                                 | Commit        |
| ----------------------------------------------- | ------------------------------------------------------- | ------------- |
| ❌ `CustomRuleRepository.languages()` removed   | Method and inner `Language` enum removed                | `0218b04b5ca` |
| ❌ `CustomRuleRepository.Language` enum removed | Use `org.sonar.plugins.javascript.api.Language` instead | `0218b04b5ca` |

**Breaking Change**: Plugins using `languages()` will fail at runtime.

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

### SonarJS 10.23.0 (April 2025)

| Change                                         | Details                                                | Commit        |
| ---------------------------------------------- | ------------------------------------------------------ | ------------- |
| ✅ `EslintHook` interface added                | New base interface for all checks/hooks                | `83ef267372c` |
| ✅ `EslintHookRegistrar` interface added       | For registering hooks without `@Rule` annotation       | `83ef267372c` |
| 🔄 `EslintBasedCheck` now extends `EslintHook` | `EslintBasedCheck extends EslintHook, JavaScriptCheck` | `83ef267372c` |

**Note**: `JsTsChecks` still uses `checkFactory.<JavaScriptCheck>` in this version. The change to `<EslintHook>` happened in 11.6.0.

**New Features in `EslintHook`**:

- `analysisModes()` - Control when hook runs (DEFAULT, SKIP_UNCHANGED)
- `blacklistedExtensions()` - Skip certain file extensions
- `isEnabled()` - Dynamically enable/disable hook

---

### SonarJS 10.22.0 (March 2025)

| Change                                  | Details                                     | Commit        |
| --------------------------------------- | ------------------------------------------- | ------------- |
| ✅ `Language` enum added (standalone)   | `org.sonar.plugins.javascript.api.Language` | `2f9168ca008` |
| ✅ `compatibleLanguages()` method added | New method in `CustomRuleRepository`        | `2f9168ca008` |
| ⚠️ `languages()` method deprecated      | Use `compatibleLanguages()` instead         | `2f9168ca008` |
| 🔄 `CustomRuleRepository` undeprecated  | Interface itself is no longer deprecated    | `2f9168ca008` |

**Migration**: Start using `compatibleLanguages()` to prepare for 11.x.

---

### SonarJS 10.15.0 (May 2024)

| Change                          | Details                           | Commit        |
| ------------------------------- | --------------------------------- | ------------- |
| 🔄 API moved to separate module | `sonar-plugin/api` module created | `968bed25aeb` |

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
  <artifactId>sonar-javascript-plugin</artifactId>
  <classifier>api</classifier>
  <scope>provided</scope>
</dependency>
```

---

### SonarJS 6.x (September 2020)

| Change                           | Details                                  | Commit        |
| -------------------------------- | ---------------------------------------- | ------------- |
| ✅ `RulesBundle` interface added | For providing custom ESLint rule bundles | `18a8b1e9481` |

---

### SonarJS 6.x (September 2019)

| Change                               | Details                     | Commit        |
| ------------------------------------ | --------------------------- | ------------- |
| ⚠️ `CustomRuleRepository` deprecated | Entire interface deprecated | `175e1fef5e7` |

**Note**: This deprecation was later reversed in 10.22.0.

---

### SonarJS 5.0.0 (September 2018)

| Change                                | Details                | Commit        |
| ------------------------------------- | ---------------------- | ------------- |
| ✅ `EslintBasedCheck` interface added | For ESLint-based rules | `123780d706d` |

---

### SonarJS 5.0.0 (July 2018)

| Change                                    | Details                                    | Commit        |
| ----------------------------------------- | ------------------------------------------ | ------------- |
| ✅ `CustomRuleRepository` interface added | Replaced `CustomJavaScriptRulesDefinition` | `5be9a033e66` |

---

### SonarJS 2.x (March 2015)

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
            └── Your custom check (either interface works)

JavaScriptCheck (marker, still functional)
```

### 11.6.0+ (Current)

```
EslintHook (recommended)
    └── Your custom check

EslintBasedCheck (deprecated, extends EslintHook)
    └── Legacy custom checks (still works)

JavaScriptCheck (deprecated, marker only)
```

---

## Compatibility Matrix

| Compiled Against                      | SQ 9.9 LTA | SQ 25.4 LTA      | SQ 25.6-25.8   | SQ 25.9+       |
| ------------------------------------- | ---------- | ---------------- | -------------- | -------------- |
| SonarJS 5.x-6.x (`javascript-checks`) | ✅         | ❌ ClassLoader   | ❌ ClassLoader | ❌ ClassLoader |
| SonarJS 9.x (`javascript-checks`)     | ✅         | ❌ ClassLoader   | ❌ ClassLoader | ❌ ClassLoader |
| SonarJS 10.15-10.21 (`api` module)    | ❌         | ✅               | ⚠️             | ⚠️             |
| SonarJS 10.22-10.26 (`api` module)    | ❌         | ❌ No EslintHook | ✅             | ✅             |
| SonarJS 11.x (`api` module)           | ❌         | ❌ No EslintHook | ✅             | ✅             |

**Legend**: ✅ Works | ⚠️ May work with deprecated APIs | ❌ Does not work

---

## Minimum Version Requirements

| Feature                              | Min SonarJS | Min SonarQube |
| ------------------------------------ | ----------- | ------------- |
| `CustomRuleRepository`               | 5.0.0       | -             |
| `EslintBasedCheck`                   | 5.0.0       | -             |
| `RulesBundle`                        | 6.x         | -             |
| Separate API module                  | 10.15.0     | -             |
| `compatibleLanguages()`              | 10.22.0     | 25.5.0        |
| `EslintHook` / `EslintHookRegistrar` | 10.23.0     | 25.6.0        |
| `languages()` removed                | 11.1.0      | 25.9.0        |
| `EslintBasedCheck` deprecated        | 11.6.0      | 25.12.0       |

---

## Migration Guides

### Migrating from SonarJS 9.x to 11.x

1. **Change dependency artifact**:

   ```xml
   <artifactId>sonar-javascript-plugin</artifactId>
   <classifier>api</classifier>
   ```

2. **Update `CustomRuleRepository`**:
   - Replace `languages()` with `compatibleLanguages()`
   - Use `org.sonar.plugins.javascript.api.Language` enum

3. **Update check classes** (recommended):
   - Replace `implements EslintBasedCheck` with `implements EslintHook`
   - Or keep `EslintBasedCheck` (deprecated but functional)

4. **Recompile** against the new API version

### Supporting Multiple SonarQube Versions

Due to classloader isolation, you **cannot** support both SonarQube 9.9 LTA and 25.x with a single JAR. Options:

1. **Separate releases**: Maintain different plugin versions for different SQ versions
2. **Drop old LTA support**: Only support SonarQube 25.4+ (current LTA)
3. **Minimum 25.6+**: If using `EslintHook` API, require SonarQube 25.6+
