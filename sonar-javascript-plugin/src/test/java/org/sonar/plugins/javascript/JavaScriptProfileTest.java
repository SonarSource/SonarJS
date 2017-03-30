/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import org.junit.Test;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.rules.Rule;
import org.sonar.api.rules.RuleFinder;
import org.sonar.api.rules.RulePriority;
import org.sonar.api.utils.ValidationMessages;
import org.sonar.javascript.checks.CheckList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Matchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class JavaScriptProfileTest {

  @Test
  public void should_create_sonar_way_profile() {
    ValidationMessages validation = ValidationMessages.create();

    RuleFinder ruleFinder = ruleFinder();
    JavaScriptProfile definition = new JavaScriptProfile(ruleFinder);
    RulesProfile profile = definition.createProfile(validation);

    assertThat(profile.getLanguage()).isEqualTo(JavaScriptLanguage.KEY);
    assertThat(profile.getName()).isEqualTo(CheckList.SONAR_WAY_PROFILE);
    assertThat(profile.getActiveRules()).extracting("repositoryKey").containsOnly(CheckList.REPOSITORY_KEY);
    assertThat(validation.hasErrors()).isFalse();
    assertThat(profile.getActiveRules().size()).isGreaterThan(60);
  }

  static RuleFinder ruleFinder() {
    return when(mock(RuleFinder.class).findByKey(anyString(), anyString())).thenAnswer(new Answer<Rule>() {
      @Override
      public Rule answer(InvocationOnMock invocation) {
        Object[] arguments = invocation.getArguments();
        return Rule.create((String) arguments[0], (String) arguments[1], (String) arguments[1]);
      }
    }).getMock();
  }

  /**
   * SonarLint will inject a rule finder containing only the rules coming from the javascript repository
   */
  private RuleFinder sonarLintRuleFinder() {
    return when(mock(RuleFinder.class).findByKey(anyString(), anyString())).thenAnswer(invocation -> {
      Object[] arguments = invocation.getArguments();
      if(CheckList.REPOSITORY_KEY.equals(arguments[0])) {
        Rule rule = Rule.create((String) arguments[0], (String) arguments[1], (String) arguments[1]);
        return rule.setSeverity(RulePriority.MINOR);
      }
      return null;
    }).getMock();
  }


}
