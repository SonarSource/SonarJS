/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.S2260;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.EslintHook;
import org.sonar.plugins.javascript.api.EslintHookRegistrar;
import org.sonar.plugins.javascript.api.Language;
import org.sonar.plugins.javascript.bridge.EslintRule;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * Central registry for all JavaScript/TypeScript rules and hooks.
 *
 * <p>This class serves three main purposes during the analysis lifecycle:</p>
 * <ol>
 *   <li><b>Building the rule registry</b> (constructor): Collects all active rules from built-in checks,
 *       custom rule repositories, and ESLint hooks. Rules are filtered by the quality profile.</li>
 *   <li><b>Providing rules to the bridge</b> ({@link #enabledEslintRules()}): Returns the list of
 *       ESLint rules to send to the Node.js bridge for execution.</li>
 *   <li><b>Converting issues back</b> ({@link #ruleKeyByEslintKey(String, Language)}): Maps ESLint
 *       rule keys back to Sonar rule keys when processing issues returned from the bridge.</li>
 * </ol>
 *
 * <h2>Two Types of Rule Sources</h2>
 *
 * <h3>1. Rules (via CheckFactory) - Can raise issues</h3>
 * <p>Rules from {@link CheckList} and {@link CustomRuleRepository} go through {@link CheckFactory},
 * which filters them by the active quality profile. Only active rules are instantiated and added
 * to the {@link #eslintKeyToRuleKey} mapping, allowing issues to be raised.</p>
 *
 * <h3>2. Hooks (via EslintHookRegistrar) - Cannot raise issues</h3>
 * <p>Hooks from {@link EslintHookRegistrar} bypass {@link CheckFactory} entirely. They always run
 * when {@link EslintHook#isEnabled()} returns true, regardless of quality profile. Since they're
 * not added to {@link #eslintKeyToRuleKey}, any issues they report are silently discarded.</p>
 *
 * @see CheckFactory SonarQube component that filters rules by quality profile
 * @see CustomRuleRepository API for external plugins to contribute rules (can raise issues)
 * @see EslintHookRegistrar API for data collection hooks (cannot raise issues)
 */
@ScannerSide
@SonarLintSide
public class JsTsChecks {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsChecks.class);

  /**
   * ESLint rule keys for rules offloaded to tsgolint (Go-based linter).
   * These rules are excluded from the Node.js bridge and run via gRPC instead.
   */
  static final Set<String> TSGOLINT_RULES = Set.of(
    "await-thenable",
    "prefer-readonly",
    "no-unnecessary-type-arguments",
    "no-unnecessary-type-assertion",
    "prefer-return-this-type",
    "no-mixed-enums",
    "prefer-promise-reject-errors"
  );

  /**
   * SonarQube-provided component that knows which rules are active in the quality profile.
   * When we call {@code checkFactory.create(repoKey).addAnnotatedChecks(classes)}, it only
   * instantiates checks whose rules are active in the current quality profile.
   */
  private final CheckFactory checkFactory;

  /**
   * External plugins can contribute custom rules by implementing {@link CustomRuleRepository}.
   * These are discovered via SonarQube's dependency injection (@ScannerSide annotation).
   */
  private final CustomRuleRepository[] customRuleRepositories;

  /**
   * Hooks registered via {@link EslintHookRegistrar}. These bypass {@link CheckFactory} and
   * always run when enabled. They cannot raise Sonar issues because they're not in
   * {@link #eslintKeyToRuleKey}.
   *
   * <p>Use case: Data collection for cross-file analysis (e.g., architecture analysis).</p>
   */
  private final Map<Language, Set<EslintHook>> eslintHooksByLanguage = new EnumMap<>(
    Language.class
  );

  /**
   * Active rule instances, filtered by quality profile via {@link CheckFactory}.
   * Key: (language, repository) → Value: Checks containing only active rule instances.
   *
   * <p>This map only contains rules that passed quality profile filtering.</p>
   */
  private final Map<LanguageAndRepository, Checks<EslintHook>> checks = new HashMap<>();

  /**
   * Mapping from ESLint rule key to Sonar rule key, used when converting issues.
   * Key: eslintKey → Value: (Language → RuleKey).
   *
   * <p>This mapping is built from active rules only. When an issue comes back from the bridge,
   * we look up the Sonar RuleKey here. If not found (e.g., for hooks), the issue is discarded.</p>
   *
   * @see #ruleKeyByEslintKey(String, Language) Used by AnalysisProcessor to convert issues
   */
  private final Map<String, Map<Language, RuleKey>> eslintKeyToRuleKey = new HashMap<>();

  private RuleKey parseErrorRuleKey;

  public JsTsChecks(CheckFactory checkFactory) {
    this(checkFactory, new CustomRuleRepository[] {}, new EslintHookRegistrar[] {});
  }

  public JsTsChecks(CheckFactory checkFactory, CustomRuleRepository[] customRuleRepositories) {
    this(checkFactory, customRuleRepositories, new EslintHookRegistrar[] {});
  }

  public JsTsChecks(CheckFactory checkFactory, EslintHookRegistrar[] eslintHookRegistrars) {
    this(checkFactory, new CustomRuleRepository[] {}, eslintHookRegistrars);
  }

  /**
   * Main constructor - builds the complete rule registry.
   *
   * @param checkFactory SonarQube-provided component with quality profile data
   * @param customRuleRepositories External plugins' custom rules (can raise issues)
   * @param eslintHookRegistrars External plugins' data collection hooks (cannot raise issues)
   */
  public JsTsChecks(
    CheckFactory checkFactory,
    CustomRuleRepository[] customRuleRepositories,
    EslintHookRegistrar[] eslintHookRegistrars
  ) {
    this.checkFactory = checkFactory;
    this.customRuleRepositories = customRuleRepositories;

    // ====================================================================================
    // STEP 1: Register hooks (bypass CheckFactory - no quality profile filtering)
    // ====================================================================================
    // Hooks are stored directly without going through CheckFactory. This means:
    // - They always run when isEnabled() returns true (no QP filtering)
    // - They are NOT added to eslintKeyToRuleKey (cannot raise issues)
    // - Use case: data collection for cross-file analysis (e.g., architecture IR generation)
    for (var registrar : eslintHookRegistrars) {
      registrar.register(
        ((language, hook) ->
          eslintHooksByLanguage.computeIfAbsent(language, it -> new HashSet<>()).add(hook))
      );
    }

    // ====================================================================================
    // STEP 2: Register rules (through CheckFactory - filtered by quality profile)
    // ====================================================================================
    // Rules go through CheckFactory which:
    // - Takes ALL rule classes (e.g., 300+ from CheckList)
    // - Filters by quality profile (only active rules are instantiated)
    // - Builds the eslintKey → RuleKey mapping (allows issues to be raised)
    //
    // Built-in rules from CheckList:
    doAddChecks(Language.TYPESCRIPT, CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
    addCustomChecks(Language.TYPESCRIPT);
    doAddChecks(Language.JAVASCRIPT, CheckList.JS_REPOSITORY_KEY, CheckList.getJavaScriptChecks());
    addCustomChecks(Language.JAVASCRIPT);

    initParsingErrorRuleKey();
  }

  /**
   * Registers rule classes through CheckFactory (quality profile filtering).
   *
   * <p>This method does three things:</p>
   * <ol>
   *   <li>Passes all rule classes to CheckFactory, which instantiates only active rules</li>
   *   <li>Stores the active rule instances in {@link #checks}</li>
   *   <li>Builds the {@link #eslintKeyToRuleKey} mapping for issue conversion</li>
   * </ol>
   *
   * @param language The language (JS or TS)
   * @param repositoryKey The Sonar repository key (e.g., "javascript", "typescript", or custom)
   * @param checkClasses ALL rule classes (not filtered) - CheckFactory will filter by QP
   */
  private void doAddChecks(Language language, String repositoryKey, Iterable<?> checkClasses) {
    // CheckFactory.create(repoKey).addAnnotatedChecks(classes):
    // - Input: ALL rule classes (e.g., 300+ classes from CheckList.getJavaScriptChecks())
    // - Reads @Rule(key = "...") annotation from each class
    // - Checks if that rule is ACTIVE in the quality profile
    // - Output: Checks<EslintHook> containing only ACTIVE rule instances (e.g., 50-100)
    var chks = checkFactory.<EslintHook>create(repositoryKey).addAnnotatedChecks(checkClasses);

    var key = new LanguageAndRepository(language, repositoryKey);
    this.checks.put(key, chks);
    LOG.debug("Added {} checks for {}", chks.all().size(), key);

    // Build the eslintKey → RuleKey mapping for active rules only.
    // This mapping is used later by ruleKeyByEslintKey() to convert ESLint issues to Sonar issues.
    // If an eslintKey is not in this map, the issue will be silently discarded.
    chks
      .all()
      .forEach(check ->
        eslintKeyToRuleKey
          .computeIfAbsent(check.eslintKey(), k -> new EnumMap<>(Language.class))
          .put(language, chks.ruleKey(check))
      );
  }

  /**
   * Registers custom rules from external plugins.
   *
   * <p>External plugins implement {@link CustomRuleRepository} to contribute their rules.
   * These go through the same CheckFactory filtering as built-in rules.</p>
   */
  private void addCustomChecks(Language language) {
    for (CustomRuleRepository repo : customRuleRepositories) {
      if (repo.compatibleLanguages().contains(language)) {
        // Custom rules also go through CheckFactory - same QP filtering as built-in rules
        doAddChecks(language, repo.repositoryKey(), repo.checkClasses());
      }
    }
  }

  /**
   * Returns all active rule instances (does not include hooks).
   */
  Stream<EslintHook> all() {
    return checks
      .values()
      .stream()
      .flatMap(c -> c.all().stream());
  }

  @Nullable
  private RuleKey ruleKeyFor(EslintHook check) {
    return checks
      .values()
      .stream()
      .map(chks -> chks.ruleKey(check))
      .filter(Objects::nonNull)
      .findFirst()
      .orElse(null);
  }

  /**
   * Looks up the Sonar RuleKey for an ESLint rule key.
   *
   * <p>This method is called by {@code AnalysisProcessor} when converting issues returned
   * from the Node.js bridge back to Sonar issues.</p>
   *
   * <p><b>Important:</b> This only returns a RuleKey for rules that went through CheckFactory
   * (i.e., active rules from CheckList or CustomRuleRepository). Hooks are not in this map,
   * so their issues will return null and be silently discarded.</p>
   *
   * @param eslintKey The ESLint rule key (e.g., "S1234" or "no-unused-vars")
   * @param language The language (JS or TS)
   * @return The Sonar RuleKey, or null if not found (issue will be discarded)
   */
  @Nullable
  public RuleKey ruleKeyByEslintKey(String eslintKey, Language language) {
    var k = eslintKeyToRuleKey.get(eslintKey);
    return k != null ? k.get(language) : null;
  }

  /**
   * parsingErrorRuleKey equals null if ParsingErrorCheck is not activated
   *
   * @return rule key for parse error
   */
  @Nullable
  RuleKey parsingErrorRuleKey() {
    return parseErrorRuleKey;
  }

  protected void initParsingErrorRuleKey() {
    this.parseErrorRuleKey = all()
      .filter(S2260.class::isInstance)
      .findFirst()
      .map(this::ruleKeyFor)
      .orElse(null);
  }

  /**
   * Returns all ESLint rules to send to the Node.js bridge for execution.
   *
   * <p>This method is called by {@code WebSensor} when building the analysis request.
   * It combines two sources:</p>
   * <ol>
   *   <li><b>Rules</b> from {@link #checks} (filtered by QP, can raise issues)</li>
   *   <li><b>Hooks</b> from {@link #eslintHooksByLanguage} (no QP filtering, cannot raise issues)</li>
   * </ol>
   *
   * <p>Note: Even though hooks are included here (their ESLint rules will execute), any issues
   * they report will be discarded because they're not in {@link #eslintKeyToRuleKey}.</p>
   *
   * @return List of ESLint rules to execute on the bridge
   */
  List<EslintRule> enabledEslintRules() {
    // Rules from checks map (went through CheckFactory, can raise issues)
    // These are only the ACTIVE rules - CheckFactory already filtered by quality profile
    var eslintRules = checks
      .entrySet()
      .stream()
      .flatMap(e ->
        e
          .getValue()
          .all()
          .stream()
          .filter(EslintHook::isEnabled)
          .map(check ->
            new EslintRule(
              check.eslintKey(),
              check.configurations(),
              check.targets(),
              check.analysisModes(),
              check.blacklistedExtensions(),
              e.getKey().language
            )
          )
      );

    // Hooks from eslintHooksByLanguage (bypassed CheckFactory, cannot raise issues)
    // These always run when isEnabled() is true - no quality profile filtering
    // Use case: data collection for cross-file analysis (e.g., architecture)
    var eslintHooks = eslintHooksByLanguage
      .entrySet()
      .stream()
      .flatMap(entry -> {
        var languageKey = entry.getKey().toString();
        return entry
          .getValue()
          .stream()
          .filter(EslintHook::isEnabled)
          .map(hook ->
            new EslintRule(
              hook.eslintKey(),
              hook.configurations(),
              hook.targets(),
              hook.analysisModes(),
              hook.blacklistedExtensions(),
              languageKey
            )
          );
      });

    // Combine both sources - all will be sent to the bridge for execution
    return Stream.concat(eslintRules, eslintHooks).toList();
  }

  /**
   * Returns ESLint rules for the bridge, excluding rules offloaded to tsgolint.
   */
  List<EslintRule> enabledBridgeEslintRules() {
    return EslintRule.findAllBut(enabledEslintRules(), TSGOLINT_RULES);
  }

  /**
   * Returns the set of tsgolint rule names that are active in the current quality profile.
   */
  List<String> enabledTsgolintRuleNames() {
    return enabledEslintRules()
      .stream()
      .map(EslintRule::getKey)
      .filter(TSGOLINT_RULES::contains)
      .collect(Collectors.toList());
  }

  static class LanguageAndRepository {

    final String language;
    final String repository;

    LanguageAndRepository(Language language, String repository) {
      this.language =
        language == Language.JAVASCRIPT ? JavaScriptLanguage.KEY : TypeScriptLanguage.KEY;
      this.repository = repository;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (o == null || getClass() != o.getClass()) return false;
      LanguageAndRepository that = (LanguageAndRepository) o;
      return Objects.equals(language, that.language) && Objects.equals(repository, that.repository);
    }

    @Override
    public int hashCode() {
      return Objects.hash(language, repository);
    }

    @Override
    public String toString() {
      return String.format("language='%s', repository='%s'", language, repository);
    }
  }
}
