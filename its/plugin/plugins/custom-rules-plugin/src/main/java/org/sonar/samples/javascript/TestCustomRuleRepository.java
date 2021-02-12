/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2021 SonarSource SA
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
package org.sonar.samples.javascript;

import com.google.common.io.CharStreams;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.api.server.rule.RulesDefinitionAnnotationLoader;
import org.sonar.api.utils.AnnotationUtils;
import org.sonar.plugins.javascript.api.CustomRuleRepository;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.samples.javascript.checks.BaseTreeVisitorCheck;
import org.sonar.samples.javascript.checks.SubscriptionBaseVisitorCheck;

public class TestCustomRuleRepository implements RulesDefinition, CustomRuleRepository {

  public static final String REPOSITORY_KEY = "javascript-custom-rules";

  @Override
  public void define(RulesDefinition.Context context) {
    RulesDefinition.NewRepository repository = context.createRepository(REPOSITORY_KEY, "js")
      .setName("Custom Repository");

    List<Class<? extends JavaScriptCheck>> checkClasses = checkClasses();
    Map<String, String> remediation = new HashMap<>();
    remediation.put("subscription", "10min");
    remediation.put("base", "5min");
    new RulesDefinitionAnnotationLoader().load(repository, checkClasses.toArray(new Class[] {}));
    checkClasses.forEach(check -> {
      org.sonar.check.Rule ruleAnnotation = AnnotationUtils.getAnnotation(check, org.sonar.check.Rule.class);
      NewRule rule = repository.rule(ruleAnnotation.key());
      rule.setHtmlDescription(loadRuleDescription(rule.key()));
      rule.setDebtRemediationFunction(rule.debtRemediationFunctions().linear(remediation.get(rule.key())));
    });

    repository.done();
  }

  @Override
  public String repositoryKey() {
    return REPOSITORY_KEY;
  }

  @Override
  public List<Class<? extends JavaScriptCheck>> checkClasses() {
    return Arrays.asList(BaseTreeVisitorCheck.class, SubscriptionBaseVisitorCheck.class);
  }

  private static String loadRuleDescription(String ruleKey) {
    try {
      InputStream resource = TestCustomRuleRepository.class.getClassLoader().getResourceAsStream(ruleKey + ".html");
      if (resource == null) {
        throw new IllegalStateException("Rule description not found");
      }
      return CharStreams.toString(new InputStreamReader(resource, StandardCharsets.UTF_8));
    } catch (IOException e) {
      throw new IllegalStateException("Error loading rule description", e);
    }
  }
}
