/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
package org.sonar.javascript.checks;

import org.junit.Test;
import org.sonar.api.rules.AnnotationRuleParser;
import org.sonar.api.rules.Rule;
import org.sonar.api.rules.RuleParam;

import java.util.List;

import static org.fest.assertions.Assertions.assertThat;

public class CheckListTest {

  /**
   * Enforces that each check has test, name and description.
   */
  @Test
  public void test() {
    List<Class> checks = CheckList.getChecks();

    for (Class cls : checks) {
      String testName = '/' + cls.getName().replace('.', '/') + "Test.class";
      assertThat(getClass().getResource(testName))
          .overridingErrorMessage("No test for " + cls.getSimpleName())
          .isNotNull();
    }

    List<Rule> rules = new AnnotationRuleParser().parse("repositoryKey", checks);
    for (Rule rule : rules) {
      assertThat(rule.getDescription())
          .overridingErrorMessage("No description for " + rule.getKey())
          .isNotEmpty();

      for (RuleParam param : rule.getParams()) {
        assertThat(param.getDescription())
            .overridingErrorMessage("No description for param " + param.getKey() + " of " + rule.getKey())
            .isNotEmpty();
      }
    }
  }

}
