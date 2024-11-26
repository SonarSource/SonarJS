/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import static org.sonar.css.CssRulesDefinition.REPOSITORY_KEY;
import static org.sonar.css.CssRulesDefinition.RESOURCE_FOLDER;

import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonarsource.analyzer.commons.BuiltInQualityProfileJsonLoader;

public class CssProfileDefinition implements BuiltInQualityProfilesDefinition {

  public static final String PROFILE_NAME = "Sonar way";
  public static final String PROFILE_PATH =
    RESOURCE_FOLDER + CssRulesDefinition.REPOSITORY_KEY + "/Sonar_way_profile.json";

  @Override
  public void define(Context context) {
    NewBuiltInQualityProfile profile = context.createBuiltInQualityProfile(
      PROFILE_NAME,
      CssLanguage.KEY
    );
    BuiltInQualityProfileJsonLoader.load(profile, REPOSITORY_KEY, PROFILE_PATH);
    profile.done();
  }
}
