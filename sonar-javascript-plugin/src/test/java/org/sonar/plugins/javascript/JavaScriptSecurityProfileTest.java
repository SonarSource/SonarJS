/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.rules.RuleFinder;
import org.sonar.api.utils.ValidationMessages;
import org.sonar.javascript.checks.CheckList;

import static org.fest.assertions.Assertions.assertThat;

public class JavaScriptSecurityProfileTest {

  @Test
  public void should_create_sonar_security_way() throws Exception {
    ValidationMessages validation = ValidationMessages.create();

    RuleFinder ruleFinder = JavaScriptProfileTest.ruleFinder();
    JavaScriptSecurityProfile definition = new JavaScriptSecurityProfile(ruleFinder);
    RulesProfile profile = definition.createProfile(validation);

    assertThat(profile.getLanguage()).isEqualTo(JavaScriptLanguage.KEY);
    assertThat(profile.getName()).isEqualTo(CheckList.SONAR_SECURITY_WAY_PROFILE);
    assertThat(profile.getActiveRulesByRepository(CheckList.REPOSITORY_KEY)).hasSize(41);
    assertThat(validation.hasErrors()).isFalse();
  }

}
