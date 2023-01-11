/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.rules;

import com.google.gson.Gson;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.lang.annotation.Annotation;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.api.SonarRuntime;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.rule.RuleStatus;
import org.sonar.api.rules.RuleType;
import org.sonar.api.server.debt.DebtRemediationFunction.Type;
import org.sonar.api.server.rule.RulesDefinition.Param;
import org.sonar.api.server.rule.RulesDefinition.Repository;
import org.sonar.api.server.rule.RulesDefinition.Rule;
import org.sonar.api.utils.Version;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.TestUtils;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

import static org.assertj.core.api.Assertions.assertThat;

class TypeScriptRulesDefinitionTest {

  private static final Gson gson = new Gson();
  private static final SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarLint(Version.create(9, 3));

  @Test
  void test() {
    Repository repository = TestUtils.buildRepository("typescript", new TypeScriptRulesDefinition(sonarRuntime));

    assertThat(repository.name()).isEqualTo("SonarQube");
    assertThat(repository.language()).isEqualTo("ts");
    assertThat(repository.rules()).hasSize(CheckList.getTypeScriptChecks().size());

    assertRuleProperties(repository);
    assertAllRuleParametersHaveDescription(repository);
  }

  @Test
  void sonarlint() {
    Repository repository = TestUtils.buildRepository("typescript", new TypeScriptRulesDefinition(sonarRuntime));
    assertThat(repository.rule("S3923").activatedByDefault()).isTrue();
  }

  @Test
  void compatibleLanguagesInJson() {
    List<Class<? extends JavaScriptCheck>> typeScriptChecks = CheckList.getTypeScriptChecks();
    List<Class<? extends JavaScriptCheck>> javaScriptChecks = CheckList.getJavaScriptChecks();
    CheckList.getAllChecks().forEach(c -> {
      boolean isTypeScriptCheck = typeScriptChecks.contains(c);
      boolean isJavaScriptCheck = javaScriptChecks.contains(c);
      Annotation ruleAnnotation = c.getAnnotation(org.sonar.check.Rule.class);
      String key = ((org.sonar.check.Rule) ruleAnnotation).key();

      RuleJson ruleJson = getRuleJson(key);
      assertThat(ruleJson.compatibleLanguages).as("For rule " + key).isNotNull().isNotEmpty();
      List<String> expected = new ArrayList<>();
      if (isTypeScriptCheck) {
        expected.add("TYPESCRIPT");
      }
      if (isJavaScriptCheck) {
        expected.add("JAVASCRIPT");
      }

      assertThat(ruleJson.compatibleLanguages).as("Failed for  " + key).containsAll(expected);
    });
  }

  @Test
  void sqKeyInJson() {
    CheckList.getAllChecks().forEach(c -> {
      Annotation ruleAnnotation = c.getAnnotation(org.sonar.check.Rule.class);
      String key = ((org.sonar.check.Rule) ruleAnnotation).key();
      RuleJson ruleJson = getRuleJson(key);
      assertThat(ruleJson.sqKey).isEqualTo(key);
    });
  }

  private static RuleJson getRuleJson(String key) {
    File file = new File(new File("../javascript-checks/src/main/resources", JavaScriptRulesDefinition.METADATA_LOCATION),
      key + ".json");
    try {
      return gson.fromJson(new FileReader(file), RuleJson.class);
    } catch (FileNotFoundException e) {
      throw new AssertionError("File for rule " + key + " is not found", e);
    }
  }

  private static class RuleJson {
    List<String> compatibleLanguages;
    String sqKey;
  }

  private void assertRuleProperties(Repository repository) {
    Rule rule = repository.rule("S3923");
    assertThat(rule).isNotNull();
    assertThat(rule.name()).isEqualTo("All branches in a conditional structure should not have exactly the same implementation");
    assertThat(rule.debtRemediationFunction().type()).isEqualTo(Type.CONSTANT_ISSUE);
    assertThat(rule.type()).isEqualTo(RuleType.BUG);
    assertThat(repository.rule("S124").template()).isTrue();
    assertThat(repository.rule("S2814").status()).isEqualTo(RuleStatus.DEPRECATED);
  }

  private void assertAllRuleParametersHaveDescription(Repository repository) {
    for (Rule rule : repository.rules()) {
      for (Param param : rule.params()) {
        assertThat(param.description()).as("description for " + param.key()).isNotEmpty();
      }
    }
  }

}
