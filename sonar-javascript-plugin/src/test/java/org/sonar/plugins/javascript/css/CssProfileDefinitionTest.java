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
package org.sonar.plugins.javascript.css;

import org.junit.jupiter.api.Test;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition.BuiltInQualityProfile;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition.Context;

import static org.assertj.core.api.Assertions.assertThat;

class CssProfileDefinitionTest {

  @Test
  void should_create_css_profile() {
    CssProfileDefinition definition = new CssProfileDefinition();
    Context context = new Context();
    definition.define(context);

    BuiltInQualityProfile profile = context.profile("css", CssProfileDefinition.PROFILE_NAME);

    assertThat(profile.language()).isEqualTo(CssLanguage.KEY);
    assertThat(profile.name()).isEqualTo(CssProfileDefinition.PROFILE_NAME);
    assertThat(profile.rules()).extracting("repoKey").containsOnly(CssRulesDefinition.REPOSITORY_KEY);
    assertThat(profile.rules()).extracting("ruleKey").hasSize(CssRules.getRuleClasses().size() - 2);
  }

}
