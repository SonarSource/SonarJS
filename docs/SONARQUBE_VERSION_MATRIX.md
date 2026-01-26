# SonarQube ↔ SonarJS Version Matrix

This document maps SonarQube versions to their bundled SonarJS plugin versions.

## How to Update This Document

### Source

The SonarJS version is defined in SonarQube's `build.gradle` file:

- Repository: https://github.com/SonarSource/sonarqube
- File: `build.gradle` (look for `sonar-javascript-plugin`)

### Getting Tags

```bash
# List all version tags (sorted)
gh api repos/SonarSource/sonarqube/tags --paginate --jq '.[].name' | grep -E "^[0-9]" | sort -V

# Tag naming conventions:
# - Community Edition: numeric versions like 25.9.0.112764
# - All editions use the same public repo tags
```

### Getting SonarJS Version for a Tag

```bash
# Single version
curl -s "https://raw.githubusercontent.com/SonarSource/sonarqube/<TAG>/build.gradle" | grep "sonar-javascript-plugin"

# Batch lookup
for tag in 25.12.0.117093 25.11.0.114957; do
  echo -n "$tag: "
  curl -s "https://raw.githubusercontent.com/SonarSource/sonarqube/$tag/build.gradle" | grep "sonar-javascript-plugin" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
done
```

## Version Matrix

> **Last updated**: 2026-01-22

### SonarQube 26.x (Current)

| SonarQube Version | SonarJS Version | Notable Changes |
| ----------------- | --------------- | --------------- |
| 26.1.0            | 11.7.1.36988    |                 |

### SonarQube 25.x

| SonarQube Version | SonarJS Version   | Notable Changes                   |
| ----------------- | ----------------- | --------------------------------- |
| 25.12.0           | 11.7.1.36988      |                                   |
| 25.11.0           | 11.5.0.35357      |                                   |
| 25.10.0           | 11.4.1.34873      |                                   |
| 25.9.0            | 11.3.0.34350      | **First SonarJS 11.x**            |
| 25.8.0            | 10.25.0.33900     |                                   |
| 25.7.0            | 10.23.0.32711     |                                   |
| 25.6.0            | 10.23.0.32711     | **First with `EslintHook` API**   |
| 25.5.0            | 10.22.0.32148     | `languages()` deprecated          |
| **25.4.0 (LTA)**  | **10.21.1.30825** | **LTA version** - no `EslintHook` |
| 25.3.0            | 10.20.x           |                                   |
| 25.2.0            | 10.19.x           |                                   |
| 25.1.0            | 10.18.x           |                                   |

### SonarQube 24.x

| SonarQube Version | SonarJS Version | Notable Changes |
| ----------------- | --------------- | --------------- |
| 24.12.0           | 10.18.0.28572   |                 |

### SonarQube 10.x

| SonarQube Version | SonarJS Version | Notable Changes |
| ----------------- | --------------- | --------------- |
| 10.7.0            | 10.16.0.27621   |                 |
| 10.6.0            | 10.14.0.26080   |                 |
| 10.5.1            | 10.13.2.25981   |                 |
| 10.4.1            | 10.11.1.25225   |                 |
| 10.3.0            | 10.9.0.24449    |                 |
| 10.2.1            | 10.5.1.22382    |                 |
| 10.1.0            | 10.3.1.21905    |                 |
| 10.0.0            | 10.1.0.21143    |                 |

### SonarQube 9.9.x (Previous LTA)

| SonarQube Version | SonarJS Version  | Notable Changes                                      |
| ----------------- | ---------------- | ---------------------------------------------------- |
| **9.9.8 (LTA)**   | **9.13.0.20537** | **Previous LTA** - API in `javascript-checks` module |
| 9.9.6             | 9.13.0.20537     |                                                      |

## SonarJS API Milestones

| SonarJS Version | Change                                                | Impact                                               |
| --------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| 9.x             | API classes in `javascript-checks` module             | Dependency: `javascript-checks` artifact             |
| 10.x            | API moved to `sonar-plugin/api` module                | Dependency: `sonar-javascript-plugin:api` classifier |
| 10.22.0         | `CustomRuleRepository.languages()` deprecated         | Use `compatibleLanguages()` instead                  |
| **10.23.0**     | **`EslintHook` and `EslintHookRegistrar` introduced** | New API for hooks                                    |
| 10.23.0+        | `languages()` method removed                          | Breaking change for old plugins                      |
| 11.6.0          | `EslintBasedCheck`, `JavaScriptCheck` deprecated      | Use `EslintHook` instead                             |

## LTA (Long Term Active) Versions

| LTA Version      | SonarJS Version | Support Status |
| ---------------- | --------------- | -------------- |
| SonarQube 25.4.0 | 10.21.1.30825   | Current LTA    |
| SonarQube 9.9.x  | 9.13.0.20537    | Previous LTA   |

## Compatibility Notes for Plugin Developers

### Minimum SonarQube Version for Features

| Feature                 | Minimum SonarJS | Minimum SonarQube |
| ----------------------- | --------------- | ----------------- |
| `EslintHook` API        | 10.23.0         | 25.6.0            |
| `EslintHookRegistrar`   | 10.23.0         | 25.6.0            |
| `compatibleLanguages()` | 10.22.0         | 25.5.0            |
| Separate API module     | ~10.x           | ~10.x             |

### Breaking Changes Timeline

1. **SonarQube 25.5.0+** (SonarJS 10.22+): `languages()` deprecated
2. **SonarQube 25.6.0+** (SonarJS 10.23+): `languages()` removed, `EslintHook` available
3. **SonarQube 25.9.0+** (SonarJS 11.x): `EslintBasedCheck`/`JavaScriptCheck` deprecated

### Plugin Compatibility Matrix

| Plugin compiled against           | Works with SQ 25.4 LTA? | Works with SQ 25.9+?                |
| --------------------------------- | ----------------------- | ----------------------------------- |
| SonarJS 9.x (`javascript-checks`) | ❌ ClassLoader issues   | ❌ ClassCastException               |
| SonarJS 10.21.x                   | ✅ Yes                  | ⚠️ Maybe (if using deprecated APIs) |
| SonarJS 10.23.x+ (`api` module)   | ❌ No `EslintHook`      | ✅ Yes                              |
