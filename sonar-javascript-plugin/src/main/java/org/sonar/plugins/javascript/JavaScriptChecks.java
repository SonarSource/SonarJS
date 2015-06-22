/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.rule.Checks;
import org.sonar.api.rule.RuleKey;
import org.sonar.plugins.javascript.api.CustomJavaScriptRulesDefinition;
import org.sonar.squidbridge.api.CodeVisitor;

import javax.annotation.Nullable;
import java.util.List;
import java.util.Set;

/**
 * Wrapper around Checks Object to ease the manipulation of the different JavaScript rule repositories.
 */
public class JavaScriptChecks {

  private final CheckFactory checkFactory;
  private Set<Checks<CodeVisitor>> checksByRepository = Sets.newHashSet();

  private JavaScriptChecks(CheckFactory checkFactory) {
    this.checkFactory = checkFactory;
  }

  public static JavaScriptChecks createJavaScriptCheck(CheckFactory checkFactory) {
    return new JavaScriptChecks(checkFactory);
  }

  public JavaScriptChecks addChecks(String repositoryKey, List<Class> checkClass) {
    checksByRepository.add(checkFactory
      .<CodeVisitor>create(repositoryKey)
      .addAnnotatedChecks(checkClass));

    return this;
  }

  public JavaScriptChecks addCustomChecks(@Nullable CustomJavaScriptRulesDefinition[] customRulesDefinitions) {
    if (customRulesDefinitions != null) {

      for (CustomJavaScriptRulesDefinition rulesDefinition : customRulesDefinitions) {
        addChecks(rulesDefinition.repositoryKey(), Lists.newArrayList(rulesDefinition.checkClasses()));
      }
    }

    return this;
  }

  public List<CodeVisitor> all() {
    List<CodeVisitor> allVisitors = Lists.newArrayList();

    for (Checks<CodeVisitor> checks : checksByRepository) {
      allVisitors.addAll(checks.all());
    }

    return allVisitors;
  }

  @Nullable
  public RuleKey ruleKeyFor(CodeVisitor check) {
    RuleKey ruleKey;

    for (Checks<CodeVisitor> checks : checksByRepository) {
      ruleKey = checks.ruleKey(check);

      if (ruleKey != null) {
        return ruleKey;
      }
    }
    return null;
  }

}
