/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.analysis;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.javascript.checks.CheckList;
import org.sonar.javascript.checks.ParsingErrorCheck;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.CustomRuleRepository.Language;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.bridge.EslintRule;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * Wrapper around Checks Object to ease the manipulation of the different JavaScript rule repositories.
 */
@ScannerSide
@SonarLintSide
public class JsTsChecks {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsChecks.class);
  private final CheckFactory checkFactory;
  private final CustomRuleRepository[] customRuleRepositories;
  private final Map<LanguageAndRepository, Checks<JavaScriptCheck>> checks = new HashMap<>();
  private final Map<String, Map<Language, RuleKey>> eslintKeyToRuleKey = new HashMap<>();
  private RuleKey parseErrorRuleKey;

  public JsTsChecks(CheckFactory checkFactory) {
    this(checkFactory, null);
  }

  public JsTsChecks(
    CheckFactory checkFactory,
    @Nullable CustomRuleRepository[] customRuleRepositories
  ) {
    this.checkFactory = checkFactory;
    this.customRuleRepositories = customRuleRepositories;
    doAddChecks(Language.TYPESCRIPT, CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
    addCustomChecks(Language.TYPESCRIPT);
    doAddChecks(Language.JAVASCRIPT, CheckList.JS_REPOSITORY_KEY, CheckList.getJavaScriptChecks());
    addCustomChecks(Language.JAVASCRIPT);
    initParsingErrorRuleKey();
  }

  private void doAddChecks(
    Language language,
    String repositoryKey,
    Iterable<Class<? extends JavaScriptCheck>> checkClass
  ) {
    var chks = checkFactory.<JavaScriptCheck>create(repositoryKey).addAnnotatedChecks(checkClass);
    var key = new LanguageAndRepository(language, repositoryKey);
    this.checks.put(key, chks);
    LOG.debug("Added {} checks for {}", chks.all().size(), key);
    chks
      .all()
      .stream()
      .filter(EslintBasedCheck.class::isInstance)
      .map(EslintBasedCheck.class::cast)
      .forEach(check ->
        eslintKeyToRuleKey
          .computeIfAbsent(check.eslintKey(), k -> new EnumMap<>(Language.class))
          .put(language, chks.ruleKey(check))
      );
  }

  private void addCustomChecks(Language language) {
    if (customRuleRepositories != null) {
      for (CustomRuleRepository repo : customRuleRepositories) {
        if (repo.languages().contains(language)) {
          doAddChecks(language, repo.repositoryKey(), repo.checkClasses());
        }
      }
    }
  }

  private Stream<JavaScriptCheck> all() {
    return checks.values().stream().flatMap(c -> c.all().stream());
  }

  Stream<EslintBasedCheck> eslintBasedChecks() {
    return all().filter(EslintBasedCheck.class::isInstance).map(EslintBasedCheck.class::cast);
  }

  @Nullable
  private RuleKey ruleKeyFor(JavaScriptCheck check) {
    return checks
      .values()
      .stream()
      .map(chks -> chks.ruleKey(check))
      .filter(Objects::nonNull)
      .findFirst()
      .orElse(null);
  }

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
    this.parseErrorRuleKey =
      all()
        .filter(ParsingErrorCheck.class::isInstance)
        .findFirst()
        .map(this::ruleKeyFor)
        .orElse(null);
  }

  List<EslintRule> eslintRules() {
    return checks
      .entrySet()
      .stream()
      .flatMap(e ->
        e
          .getValue()
          .all()
          .stream()
          .filter(EslintBasedCheck.class::isInstance)
          .map(EslintBasedCheck.class::cast)
          .map(check ->
            new EslintRule(
              check.eslintKey(),
              check.configurations(),
              check.targets(),
              e.getKey().language
            )
          )
      )
      .toList();
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
