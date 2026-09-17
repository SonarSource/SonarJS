# @sonarsource/analyzer-commons-configurations

Shared analyzer configuration data (secret-exclusion regexes) generated from the sonar-analyzer-commons
SecretClassifier, for use by non-JVM SonarSource analyzers.

The payload is `secret-patterns.json`.

`secret-exclusion-corpus.json` is the matching validation corpus. Every `knownNonSecrets` value must be suppressed by
`secret-patterns.json` in your regex engine - either matched by a `patternGroups` regex or equal to an
`exactMatchGroups` value, following the `match` semantics declared in that file - and no `secretCandidates` value may
be. Assert both in your own test suite, so a pattern that fails to compile or behaves differently outside the JVM is
caught here rather than becoming a missed or a noisy secret finding. A sample's `category` is informational and should
not be asserted on.

See [SonarSource/sonar-analyzer-commons](https://github.com/SonarSource/sonar-analyzer-commons) for details.
