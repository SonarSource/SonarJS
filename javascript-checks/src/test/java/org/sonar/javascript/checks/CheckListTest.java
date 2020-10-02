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
package org.sonar.javascript.checks;

import com.google.common.collect.Lists;
import java.io.File;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.commons.io.FileUtils;
import org.junit.Test;
import org.sonar.api.rules.AnnotationRuleParser;
import org.sonar.api.rules.Rule;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

import static org.assertj.core.api.Assertions.assertThat;

public class CheckListTest {

  /**
   * Enforces that each check declared in list.
   */
  @Test
  public void count() {
    int count = 0;
    List<File> files = (List<File>) FileUtils.listFiles(new File("src/main/java/org/sonar/javascript/checks/"), new String[]{"java"}, false);
    for (File file : files) {
      String name = file.getName();
      if (name.endsWith("Check.java") && !name.startsWith("Abstract")) {
        count++;
      }
    }
    assertThat(CheckList.getAllChecks().size()).isEqualTo(count);
  }

  /**
   * Enforces that each check has test, name and description.
   */
  @Test
  public void test() {
    List<Class<? extends JavaScriptCheck>> checks = CheckList.getAllChecks();

    for (Class<? extends JavaScriptCheck> cls : checks) {
      if (!cls.getSimpleName().equals("ParsingErrorCheck") && !isEslintBasedCheck(cls)) {
        String testName = '/' + cls.getName().replace('.', '/') + "Test.class";
        assertThat(getClass().getResource(testName))
          .overridingErrorMessage("No test for " + cls.getSimpleName())
          .isNotNull();
      }
    }

    List<String> keys = Lists.newArrayList();
    List<Rule> rules = new AnnotationRuleParser().parse("repositoryKey", Collections.unmodifiableList(checks));
    for (Rule rule : rules) {
      keys.add(rule.getKey());
      assertThat(getClass().getResource("/org/sonar/l10n/javascript/rules/javascript/" + rule.getKey() + ".html"))
        .overridingErrorMessage("No description for " + rule.getKey())
        .isNotNull();

      assertThat(rule.getDescription())
        .overridingErrorMessage("Description of " + rule.getKey() + " should be in separate file")
        .isNull();
    }

    // these rules have different implementation for TS and JS
    keys.remove("S3854");
    keys.remove("S3402");
    keys.remove("S3533");
    keys.remove("S3863");
    keys.remove("S4043");
    
    // this rule has the same implementation for TS and JS, but defines a different rule property
    keys.remove("S1541");

    assertThat(keys).doesNotHaveDuplicates();
  }

  @Test
  public void test_eslint_key() throws IllegalAccessException, InstantiationException {
    List<Class<? extends JavaScriptCheck>> checks = CheckList.getAllChecks();
    List<String> keys = Lists.newArrayList();

    for (Class<? extends JavaScriptCheck> cls : checks) {
      if (isEslintBasedCheck(cls)) {
        EslintBasedCheck eslintBasedCheck = (EslintBasedCheck) cls.newInstance();
        keys.add(eslintBasedCheck.eslintKey());
        assertThat(eslintBasedCheck.eslintKey()).matches("[a-z\\-]+");
      }
    }

    // this rule has the same implementation for TS and JS, but defines a different rule property
    keys.remove("cyclomatic-complexity");

    assertThat(keys).doesNotHaveDuplicates();
  }

  @Test
  public void testTypeScriptChecks() {
    List<Class<? extends JavaScriptCheck>> typeScriptChecks = CheckList.getTypeScriptChecks();
    assertThat(typeScriptChecks).isNotEmpty();
    assertThat(typeScriptChecks).isNotEqualTo(CheckList.getAllChecks());
    typeScriptChecks.removeIf(c -> c == ParsingErrorCheck.class);
    assertThat(typeScriptChecks).allMatch(EslintBasedCheck.class::isAssignableFrom);
  }

  @Test
  public void testJavaScriptChecks() {
    List<Class<? extends JavaScriptCheck>> javaScriptChecks = CheckList.getJavaScriptChecks();
    assertThat(javaScriptChecks).isNotEmpty();
    assertThat(javaScriptChecks).isNotEqualTo(CheckList.getAllChecks());
  }

  @Test
  public void testEveryCheckBelongsToLanguage() {
    Set<Class<? extends JavaScriptCheck>> allChecks = new HashSet<>(CheckList.getAllChecks());
    Set<Class<? extends JavaScriptCheck>> tsAndJsChecks = new HashSet<>(CheckList.getTypeScriptChecks());
    tsAndJsChecks.addAll(CheckList.getJavaScriptChecks());

    assertThat(allChecks).isEqualTo(tsAndJsChecks);
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
