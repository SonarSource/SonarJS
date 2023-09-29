/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.javascript.checks;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

class CheckListTest {

  private static final int CHECKS_PROPERTIES_COUNT = 35;

  /**
   * Enforces that each check declared in list.
   */
  @Test
  void count() throws Exception {
    long count = Files
      .list(Paths.get("src/main/java/org/sonar/javascript/checks/"))
      .filter(p -> p.toString().endsWith("Check.java") && !p.toString().startsWith("Abstract"))
      .count();
    assertThat(CheckList.getAllChecks().size()).isEqualTo(count);
  }

  /**
   * Enforces that each check has test, name and description.
   */
  @Test
  void test() {
    List<Class<? extends JavaScriptCheck>> checks = CheckList.getAllChecks();

    for (Class<? extends JavaScriptCheck> cls : checks) {
      if (!cls.getSimpleName().equals("ParsingErrorCheck") && !isEslintBasedCheck(cls)) {
        String testName = '/' + cls.getName().replace('.', '/') + "Test.class";
        assertThat(getClass().getResource(testName))
          .overridingErrorMessage("No test for " + cls.getSimpleName())
          .isNotNull();
      }
    }

    var keys = checks
      .stream()
      .map(c -> c.getAnnotation(org.sonar.check.Rule.class).key())
      .collect(Collectors.toList());
    for (var key : keys) {
      assertThat(
        getClass().getResource("/org/sonar/l10n/javascript/rules/javascript/" + key + ".html")
      )
        .overridingErrorMessage("No description for " + key)
        .isNotNull();
    }

    // these rules have different implementation for TS and JS
    keys.remove("S3854");
    keys.remove("S3402");
    keys.remove("S3863");

    // this rule has the same implementation for TS and JS, but defines a different rule property
    keys.remove("S1541");

    assertThat(keys).doesNotHaveDuplicates();
  }

  @Test
  void test_eslint_key() throws IllegalAccessException, InstantiationException {
    List<Class<? extends JavaScriptCheck>> checks = CheckList.getAllChecks();
    List<String> keys = new ArrayList<>();

    for (Class<? extends JavaScriptCheck> cls : checks) {
      if (isEslintBasedCheck(cls)) {
        EslintBasedCheck eslintBasedCheck = (EslintBasedCheck) cls.newInstance();
        keys.add(eslintBasedCheck.eslintKey());
        assertThat(eslintBasedCheck.eslintKey())
          .as("Invalid key for " + eslintBasedCheck.getClass())
          .matches("[a-z\\d\\-]+");
      }
    }

    // this rule has the same implementation for TS and JS, but defines a different rule property
    keys.remove("cyclomatic-complexity");

    assertThat(keys).doesNotHaveDuplicates();
  }

  @Test
  void testTypeScriptChecks() {
    List<Class<? extends JavaScriptCheck>> typeScriptChecks = CheckList.getTypeScriptChecks();
    assertThat(typeScriptChecks).isNotEmpty();
    assertThat(typeScriptChecks).isNotEqualTo(CheckList.getAllChecks());
    typeScriptChecks.removeIf(c -> c == ParsingErrorCheck.class);
    assertThat(typeScriptChecks).allMatch(EslintBasedCheck.class::isAssignableFrom);
  }

  @Test
  void testJavaScriptChecks() {
    List<Class<? extends JavaScriptCheck>> javaScriptChecks = CheckList.getJavaScriptChecks();
    assertThat(javaScriptChecks).isNotEmpty();
    assertThat(javaScriptChecks).isNotEqualTo(CheckList.getAllChecks());
  }

  @Test
  void testEveryCheckBelongsToLanguage() {
    Set<Class<? extends JavaScriptCheck>> allChecks = new HashSet<>(CheckList.getAllChecks());
    Set<Class<? extends JavaScriptCheck>> tsAndJsChecks = new HashSet<>(
      CheckList.getTypeScriptChecks()
    );
    tsAndJsChecks.addAll(CheckList.getJavaScriptChecks());

    assertThat(allChecks).isEqualTo(tsAndJsChecks);
  }

  /*
   * This test raises awareness of the consequence of a rule adding or removing a rule property.
   * If a new rule property is added to an existing rule, we should inform the SonarCloud team
   * about it on release. Rule properties of newly added rules are not concerned by that.
   */
  @Test
  void testChecksPropertiesCount() {
    var count = 0;
    for (var clazz : CheckList.getAllChecks()) {
      for (var field : clazz.getDeclaredFields()) {
        if (field.isAnnotationPresent(RuleProperty.class)) {
          count++;
        }
      }
    }
    assertThat(count).isEqualTo(CHECKS_PROPERTIES_COUNT);
  }

  private boolean isEslintBasedCheck(Class<? extends JavaScriptCheck> cls) {
    try {
      cls.getMethod("eslintKey");
      return true;
    } catch (NoSuchMethodException e) {
      return false;
    }
  }
}
