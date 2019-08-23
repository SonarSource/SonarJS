/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition.BuiltInQualityProfile;
import org.sonar.javascript.checks.CheckList;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptProfilesDefinitionTest {
  private BuiltInQualityProfilesDefinition.Context context = new BuiltInQualityProfilesDefinition.Context();

  @Before
  public void setUp() {
    new JavaScriptProfilesDefinition().define(context);
  }

  @Test
  public void sonar_way_js() {
    BuiltInQualityProfile profile = context.profile(JavaScriptLanguage.KEY, JavaScriptProfilesDefinition.SONAR_WAY);

    assertThat(profile.language()).isEqualTo(JavaScriptLanguage.KEY);
    assertThat(profile.name()).isEqualTo(JavaScriptProfilesDefinition.SONAR_WAY);
    assertThat(profile.rules()).extracting("repoKey").containsOnly(CheckList.JS_REPOSITORY_KEY);
    assertThat(profile.rules().size()).isGreaterThan(50);
  }

  @Test
  public void sonar_way_recommended_js() {
    BuiltInQualityProfile profile = context.profile(JavaScriptLanguage.KEY, JavaScriptProfilesDefinition.SONAR_WAY_RECOMMENDED);

    assertThat(profile.language()).isEqualTo(JavaScriptLanguage.KEY);
    assertThat(profile.name()).isEqualTo(JavaScriptProfilesDefinition.SONAR_WAY_RECOMMENDED);
    assertThat(profile.rules()).extracting("repoKey").containsOnly("common-js", CheckList.JS_REPOSITORY_KEY);
    assertThat(profile.rules().size()).isGreaterThan(110);
  }

  @Test
  public void sonar_way_ts() {
    BuiltInQualityProfile profile = context.profile(TypeScriptLanguage.KEY, JavaScriptProfilesDefinition.SONAR_WAY);

    assertThat(profile.language()).isEqualTo(TypeScriptLanguage.KEY);
    assertThat(profile.name()).isEqualTo(JavaScriptProfilesDefinition.SONAR_WAY);
    assertThat(profile.rules()).extracting("repoKey").containsOnly(CheckList.TS_REPOSITORY_KEY);
    assertThat(profile.rules().size()).isGreaterThan(0);
  }

  @Test
  public void sonar_way_recommended_ts() {
    BuiltInQualityProfile profile = context.profile(TypeScriptLanguage.KEY, JavaScriptProfilesDefinition.SONAR_WAY_RECOMMENDED);

    assertThat(profile.language()).isEqualTo(TypeScriptLanguage.KEY);
    assertThat(profile.name()).isEqualTo(JavaScriptProfilesDefinition.SONAR_WAY_RECOMMENDED);
    assertThat(profile.rules()).extracting("repoKey").containsOnly("common-ts", CheckList.TS_REPOSITORY_KEY);
    assertThat(profile.rules().size()).isGreaterThan(1);
  }
}
