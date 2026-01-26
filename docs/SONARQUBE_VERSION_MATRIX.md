# SonarQube ↔ SonarJS Version Matrix

This document maps SonarQube versions to their bundled SonarJS plugin versions.

## How to Update This Document

### Source

The SonarJS version is defined in SonarQube's `build.gradle` file.

**Two different repositories/products:**

| Product                     | Repository                               | Tag Format           | Example               |
| --------------------------- | ---------------------------------------- | -------------------- | --------------------- |
| Community Edition           | `SonarSource/sonarqube` (public)         | `YY.R.P.BUILD`       | `25.9.0.112764`       |
| Server/Developer/Enterprise | `SonarSource/sonar-enterprise` (private) | `sqs-YYYY.R.P.BUILD` | `sqs-2025.4.4.119049` |

### Getting Tags

```bash
# Community Edition tags
gh api repos/SonarSource/sonarqube/tags --paginate --jq '.[].name' | grep -E "^[0-9]" | sort -V

# Enterprise tags (requires access)
gh api repos/SonarSource/sonar-enterprise/tags --paginate --jq '.[].name' | grep "^sqs-" | sort -V
```

### Getting SonarJS Version for a Tag

```bash
# Community Edition (public repo, can use curl)
curl -s "https://raw.githubusercontent.com/SonarSource/sonarqube/<TAG>/build.gradle" | grep "sonar-javascript-plugin"

# Community Edition batch lookup
for tag in 25.12.0.117093 25.11.0.114957; do
  echo -n "$tag: "
  curl -s "https://raw.githubusercontent.com/SonarSource/sonarqube/$tag/build.gradle" | grep "sonar-javascript-plugin" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
done

# Server/Enterprise (private repo, requires gh CLI with access)
gh api repos/SonarSource/sonar-enterprise/contents/build.gradle?ref=<TAG> --jq '.content' | base64 -d | grep "sonar-javascript-plugin"

# Server/Enterprise batch lookup
for tag in sqs-2025.6.1.117629 sqs-2025.5.0.113872; do
  echo -n "$tag: "
  gh api repos/SonarSource/sonar-enterprise/contents/build.gradle?ref=$tag --jq '.content' | base64 -d | grep "sonar-javascript-plugin" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
done
```

## Version Matrix

> **Last updated**: 2026-01-26

### SonarQube Community Edition (from `sonarqube` repo)

These versions are from the public `SonarSource/sonarqube` repository.

#### Community 26.x

| Version | Tag             | SonarJS Version | Notable Changes |
| ------- | --------------- | --------------- | --------------- |
| 26.1.0  | `26.1.0.118079` | 11.7.1.36988    |                 |

#### Community 25.x

| Version | Tag              | SonarJS Version | Notable Changes                 |
| ------- | ---------------- | --------------- | ------------------------------- |
| 25.12.0 | `25.12.0.117093` | 11.7.1.36988    |                                 |
| 25.11.0 | `25.11.0.114957` | 11.5.0.35357    |                                 |
| 25.10.0 | `25.10.0.114319` | 11.4.1.34873    |                                 |
| 25.9.0  | `25.9.0.112764`  | 11.3.0.34350    | **First SonarJS 11.x**          |
| 25.8.0  | `25.8.0.112029`  | 10.25.0.33900   |                                 |
| 25.7.0  | `25.7.0.110598`  | 10.23.0.32711   |                                 |
| 25.6.0  | `25.6.0.109173`  | 10.23.0.32711   | **First with `EslintHook` API** |
| 25.5.0  | `25.5.0.107428`  | 10.22.0.32148   | `languages()` deprecated        |
| 25.4.0  | `25.4.0.105899`  | 10.21.1.30825   | No `EslintHook`                 |
| 25.3.0  | `25.3.0.104237`  | 10.20.x         |                                 |
| 25.2.0  | `25.2.0.102705`  | 10.19.x         |                                 |
| 25.1.0  | `25.1.0.102122`  | 10.20.0.29356   |                                 |

#### Community 24.x

| Version | Tag              | SonarJS Version | Notable Changes |
| ------- | ---------------- | --------------- | --------------- |
| 24.12.0 | `24.12.0.100206` | 10.18.0.28572   |                 |

#### Community 10.x

| Version | Tag            | SonarJS Version | Notable Changes |
| ------- | -------------- | --------------- | --------------- |
| 10.7.0  | `10.7.0.96327` | 10.16.0.27621   |                 |
| 10.6.0  | `10.6.0.92116` | 10.14.0.26080   |                 |
| 10.5.1  | `10.5.1.90531` | 10.13.2.25981   |                 |
| 10.4.1  | `10.4.1.88267` | 10.11.1.25225   |                 |
| 10.3.0  | `10.3.0.82913` | 10.9.0.24449    |                 |
| 10.2.1  | `10.2.1.78527` | 10.5.1.22382    |                 |
| 10.1.0  | `10.1.0.73491` | 10.3.1.21905    |                 |
| 10.0.0  | `10.0.0.68432` | 10.1.0.21143    |                 |

#### Community 9.9.x

| Version | Tag            | SonarJS Version | Notable Changes                   |
| ------- | -------------- | --------------- | --------------------------------- |
| 9.9.8   | `9.9.8.100196` | 9.13.0.20537    | API in `javascript-checks` module |
| 9.9.6   | `9.9.6.92038`  | 9.13.0.20537    |                                   |

### SonarQube Server/Developer/Enterprise (from `sonar-enterprise` repo)

These versions are from the private `SonarSource/sonar-enterprise` repository.

#### Server 2025.x

| Version  | Tag                   | SonarJS Version | Notable Changes             |
| -------- | --------------------- | --------------- | --------------------------- |
| 2025.6.1 | `sqs-2025.6.1.117629` | 11.7.1.36988    |                             |
| 2025.6.0 | `sqs-2025.6.0.117042` | 11.7.1.36988    |                             |
| 2025.5.0 | `sqs-2025.5.0.113872` | 11.4.0.34681    |                             |
| 2025.4.4 | `sqs-2025.4.4.119049` | 10.26.0.35551   |                             |
| 2025.4.3 | `sqs-2025.4.3.113915` | 10.25.0.33900   |                             |
| 2025.4.2 | `sqs-2025.4.2.112048` | 10.25.0.33900   |                             |
| 2025.4.1 | `sqs-2025.4.1.111832` | 10.25.0.33900   |                             |
| 2025.4.0 | `sqs-2025.4.0.111749` | 10.25.0.33900   | **First with `EslintHook`** |
| 2025.3.1 | `sqs-2025.3.1.109879` | 10.23.0.32711   |                             |
| 2025.3.0 | `sqs-2025.3.0.108892` | 10.23.0.32711   |                             |
| 2025.2.0 | `sqs-2025.2.0.105476` | 10.21.1.30825   | No `EslintHook`             |
| 2025.1.5 | `sqs-2025.1.5.119025` | 10.21.2.35552   |                             |
| 2025.1.4 | `sqs-2025.1.4.113907` | 10.21.1.30825   |                             |
| 2025.1.3 | `sqs-2025.1.3.110580` | 10.21.1.30825   |                             |
| 2025.1.2 | `sqs-2025.1.2.108896` | 10.21.1.30825   |                             |
| 2025.1.1 | `sqs-2025.1.1.104738` | 10.21.1.30825   |                             |
| 2025.1.0 | `sqs-2025.1.0.102418` | 10.20.0.29356   |                             |

#### Server 10.8.x

| Version | Tag                 | SonarJS Version | Notable Changes |
| ------- | ------------------- | --------------- | --------------- |
| 10.8.1  | `sqs-10.8.1.101195` | 10.18.0.28572   |                 |
| 10.8.0  | `sqs-10.8.0.100206` | 10.18.0.28572   |                 |

## SonarJS API Milestones

| SonarJS Version | Change                                                | Impact                                   |
| --------------- | ----------------------------------------------------- | ---------------------------------------- |
| 9.x             | API classes in `javascript-checks` module             | Dependency: `javascript-checks` artifact |
| 10.15.0+        | API moved to `sonar-plugin/api` module                | Dependency: `api` artifact               |
| 10.22.0         | `CustomRuleRepository.languages()` deprecated         | Use `compatibleLanguages()` instead      |
| **10.23.0**     | **`EslintHook` and `EslintHookRegistrar` introduced** | New API for hooks                        |
| 10.23.0+        | `languages()` method removed                          | Breaking change for old plugins          |
| 11.6.0          | `EslintBasedCheck`, `JavaScriptCheck` deprecated      | Use `EslintHook` instead                 |

## Compatibility Notes for Plugin Developers

### Minimum SonarJS Version for Features

| Feature                 | Minimum SonarJS |
| ----------------------- | --------------- |
| `EslintHook` API        | 10.23.0         |
| `EslintHookRegistrar`   | 10.23.0         |
| `compatibleLanguages()` | 10.22.0         |
| Separate API module     | 10.15.0         |

### Breaking Changes Timeline

1. **SonarJS 10.22+**: `languages()` deprecated
2. **SonarJS 10.23+**: `languages()` removed, `EslintHook` available
3. **SonarJS 11.6+**: `EslintBasedCheck`/`JavaScriptCheck` deprecated, `JsTsChecks` uses `checkFactory.<EslintHook>`

### Plugin Compatibility Matrix

| Plugin compiled against           | Implements         | SonarJS 10.23-11.5                        | SonarJS 11.6+         |
| --------------------------------- | ------------------ | ----------------------------------------- | --------------------- |
| SonarJS 9.x (`javascript-checks`) | `EslintBasedCheck` | ❌ ClassCastException                     | ❌ ClassCastException |
| SonarJS 10.23+ (`api` module)     | `EslintBasedCheck` | ✅                                        | ✅ (deprecated)       |
| SonarJS 10.23+ (`api` module)     | `EslintHook` only  | ❌ CheckFactory expects `JavaScriptCheck` | ✅                    |
