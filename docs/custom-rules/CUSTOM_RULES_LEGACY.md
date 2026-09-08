# Legacy Custom Rules API

> **Removed from the SonarJS 14.0.0-SNAPSHOT API; SonarJS 14.0.0 is not yet released.**

The public `Check`, `EslintBasedCheck`, `JavaScriptCheck`, and `TestFileCheck` types were
deprecated for removal in SonarJS 11.6.0 and are absent from the current 14.0.0-SNAPSHOT development
line. This page remains as a migration target for existing links; the executable legacy guide has
been retired.

Plugins whose classes reference any of the removed types must be migrated and recompiled before
they can run with SonarJS 14.0 or later. Use the current [EslintHook API](ESLINT_HOOKS.md) for all
custom rules. `CustomRuleRepository` itself was not removed and remains the supported registration
API for repository-backed custom rules.

## Migration Summary

1. Make every check class implement `EslintHook` directly. Remove `extends Check` or
   `extends TestFileCheck`, or replace `implements EslintBasedCheck` or
   `implements JavaScriptCheck` with `implements EslintHook`.
2. Implement `eslintKey()` explicitly.
   - If a class previously extended `Check` and relied on the `@Rule` annotation for this value,
     return `getClass().getAnnotation(Rule.class).key()` to preserve that behavior, or return the
     corresponding ESLint rule key directly.
3. Preserve any overrides of `configurations()`, `targets()`, `analysisModes()`,
   `blacklistedExtensions()`, and `isEnabled()`; these methods are available on `EslintHook`.
4. For a test-only rule that previously extended `TestFileCheck`, override `targets()`:

   ```java
   @Override
   public List<InputFile.Type> targets() {
     return List.of(InputFile.Type.TEST);
   }
   ```

5. Keep the migrated classes in `CustomRuleRepository.checkClasses()`. Compile against the oldest
   SonarJS API you intend to support (11.6 or later for direct repository rules), and test the
   resulting plugin with the current SonarJS 14.0.0-SNAPSHOT build, or with SonarJS 14.0.0 once it
   is released.

Direct `EslintHook` custom rules registered through `CustomRuleRepository` are supported from
SonarJS 11.6. In SonarJS 10.23 through 11.5.x, a class implementing only `EslintHook` can be
registered only through `EslintHookRegistrar`, whose hooks cannot raise Sonar issues; repository
rules still need the legacy check contract.

For this API migration, publish a separate legacy plugin build only if SonarJS 11.5.x or earlier
must remain supported. A plugin loaded by the current 14.0.0-SNAPSHOT build, or by SonarJS 14.0.0
once released, must not contain class references to the removed types.

See the [Custom Rules API changelog](CUSTOM_RULES_API_CHANGELOG.md) for the complete API history and
runtime compatibility details.
