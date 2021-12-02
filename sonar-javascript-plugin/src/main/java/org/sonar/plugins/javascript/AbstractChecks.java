/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.CustomRuleRepository.Language;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

public class AbstractChecks {
  private static final Logger LOG = Loggers.get(AbstractChecks.class);
  private final CheckFactory checkFactory;
  private final CustomRuleRepository[] customRuleRepositories;
  private final Map<Language, List<Checks<JavaScriptCheck>>> checksByRepository = new EnumMap<>(Language.class);
  private final Map<String, Map<Language, RuleKey>> ruleKeyByEslintKey = new HashMap<>();

  public AbstractChecks(CheckFactory checkFactory, @Nullable CustomRuleRepository[] customRuleRepositories) {
    this.checkFactory = checkFactory;
    this.customRuleRepositories = customRuleRepositories;
  }

  protected void addChecks(Language language, String repositoryKey, Iterable<Class<? extends JavaScriptCheck>> checkClass) {
    doAddChecks(language, repositoryKey, checkClass);
    addCustomChecks(language);
  }

  private void doAddChecks(Language language, String repositoryKey, Iterable<Class<? extends JavaScriptCheck>> checkClass) {
    var checks = checkFactory
      .<JavaScriptCheck>create(repositoryKey)
      .addAnnotatedChecks(checkClass);
    checksByRepository.computeIfAbsent(language, l -> new ArrayList<>()).add(checks);
    for (var check : checks.all()) {
      if (check instanceof EslintBasedCheck) {
        var ruleKey = checks.ruleKey(check);
        var eslintKey = ((EslintBasedCheck) check).eslintKey();
        ruleKeyByEslintKey.computeIfAbsent(eslintKey, k -> new EnumMap<>(Language.class)).put(language, ruleKey);
      }
    }
  }

  private void addCustomChecks(Language language) {
    if (customRuleRepositories != null) {
      for (CustomRuleRepository repo : customRuleRepositories) {
        if (repo.languages().contains(language)) {
          LOG.debug("Adding rules for repository '{}', language: {}, {} from {}", repo.repositoryKey(), language,
            repo.checkClasses(),
            repo.getClass().getCanonicalName());
          doAddChecks(language, repo.repositoryKey(), repo.checkClasses());
        }
      }
    }
  }

  public Stream<JavaScriptCheck> all() {
    return checksByRepository.values().stream()
      .flatMap(List::stream)
      .flatMap(checks -> checks.all().stream());
  }

  public Stream<EslintBasedCheck> eslintBasedChecks() {
    return all()
      .filter(EslintBasedCheck.class::isInstance)
      .map(EslintBasedCheck.class::cast);
  }

  public Optional<RuleKey> ruleKeyFor(JavaScriptCheck check) {
    return checksByRepository.values().stream()
      .flatMap(List::stream)
      .map(c -> c.ruleKey(check))
      .findFirst();
  }

  @Nullable
  public RuleKey ruleKeyByEslintKey(String eslintKey, Language language) {
    var ruleKeyByLanguage = ruleKeyByEslintKey.get(eslintKey);
    if (ruleKeyByLanguage != null) {
      return ruleKeyByLanguage.get(language);
    }
    return null;
  }
}
