/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.rule.RuleKey;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.javascript.se.SeCheck;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

/**
 * Wrapper around Checks Object to ease the manipulation of the different JavaScript rule repositories.
 */
public class JavaScriptChecks {

  private static final Logger LOG = Loggers.get(JavaScriptChecks.class);

  private final CheckFactory checkFactory;
  private Set<Checks<JavaScriptCheck>> checksByRepository = new HashSet<>();

  private JavaScriptChecks(CheckFactory checkFactory) {
    this.checkFactory = checkFactory;
  }

  public static JavaScriptChecks createJavaScriptChecks(CheckFactory checkFactory) {
    return new JavaScriptChecks(checkFactory);
  }

  public JavaScriptChecks addChecks(String repositoryKey, Iterable<Class<? extends JavaScriptCheck>> checkClass) {
    checksByRepository.add(checkFactory
      .<JavaScriptCheck>create(repositoryKey)
      .addAnnotatedChecks(checkClass));

    return this;
  }

  public JavaScriptChecks addCustomChecks(@Nullable CustomJavaScriptRulesDefinition[] customRulesDefinitions,
                                          @Nullable CustomRuleRepository[] customRuleRepositories) {

    if (customRulesDefinitions != null || customRuleRepositories != null) {
      LOG.warn("JavaScript analyzer custom rules are deprecated. Consider using ESlint custom rules instead");
    }

    if (customRulesDefinitions != null) {
      for (CustomJavaScriptRulesDefinition rulesDefinition : customRulesDefinitions) {
        addChecks(rulesDefinition.repositoryKey(), Arrays.asList(rulesDefinition.checkClasses()));
      }
    }

    if (customRuleRepositories != null) {
      for (CustomRuleRepository repo : customRuleRepositories) {
        addChecks(repo.repositoryKey(), repo.checkClasses());
      }
    }

    return this;
  }

  public List<JavaScriptCheck> all() {
    List<JavaScriptCheck> allVisitors = new ArrayList<>();

    for (Checks<JavaScriptCheck> checks : checksByRepository) {
      allVisitors.addAll(checks.all());
    }

    return allVisitors;
  }

  public List<SeCheck> seChecks() {
    List<SeCheck> checks = new ArrayList<>();
    for (JavaScriptCheck check : all()) {
      if (check instanceof SeCheck) {
        checks.add((SeCheck) check);
      }
    }

    return checks;
  }

  public List<TreeVisitor> visitorChecks() {
    List<TreeVisitor> checks = new ArrayList<>();
    for (JavaScriptCheck check : all()) {
      if (check instanceof TreeVisitor) {
        checks.add((TreeVisitor) check);
      }
    }

    return checks;
  }

  public List<EslintBasedCheck> eslintBasedChecks() {
    return all().stream()
      .filter(EslintBasedCheck.class::isInstance)
      .map(check -> (EslintBasedCheck) check)
      .collect(Collectors.toList());
  }

  @Nullable
  public RuleKey ruleKeyFor(JavaScriptCheck check) {
    RuleKey ruleKey;

    for (Checks<JavaScriptCheck> checks : checksByRepository) {
      ruleKey = checks.ruleKey(check);

      if (ruleKey != null) {
        return ruleKey;
      }
    }
    return null;
  }

  @Nullable
  public RuleKey ruleKeyByEslintKey(String eslintKey) {
    RuleKey ruleKey;

    for (Checks<JavaScriptCheck> checks : checksByRepository) {
      for (JavaScriptCheck check : checks.all()) {
        if (check instanceof EslintBasedCheck && ((EslintBasedCheck) check).eslintKey().equals(eslintKey)) {
          ruleKey = checks.ruleKey(check);
          if (ruleKey != null) {
            return ruleKey;
          }
        }
      }

    }
    return null;
  }

}
