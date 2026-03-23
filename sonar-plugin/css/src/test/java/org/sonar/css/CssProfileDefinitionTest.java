/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.css;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.sonar.api.SonarRuntime;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition.BuiltInQualityProfile;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition.Context;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.api.utils.Version;

class CssProfileDefinitionTest {

  private static final SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarLint(
    Version.create(9, 3)
  );

  @Test
  void should_create_css_profile() {
    CssProfileDefinition definition = new CssProfileDefinition();
    Context context = new Context();
    definition.define(context);

    BuiltInQualityProfile profile = context.profile("css", CssProfileDefinition.PROFILE_NAME);

    assertThat(profile.language()).isEqualTo(CssLanguage.KEY);
    assertThat(profile.name()).isEqualTo(CssProfileDefinition.PROFILE_NAME);
    assertThat(profile.rules())
      .extracting("repoKey")
      .containsOnly(CssRulesDefinition.REPOSITORY_KEY);
    Set<String> activatedByDefaultKeys = CssRulesDefinitionTest.buildRepository(
      CssLanguage.KEY,
      new CssRulesDefinition(sonarRuntime)
    )
      .rules()
      .stream()
      .filter(RulesDefinition.Rule::activatedByDefault)
      .map(RulesDefinition.Rule::key)
      .collect(Collectors.toSet());
    assertThat(profile.rules())
      .extracting("ruleKey")
      .containsExactlyInAnyOrderElementsOf(activatedByDefaultKeys);
  }
}
