/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;

public class CssProfileDefinition implements BuiltInQualityProfilesDefinition {

  public static final String PROFILE_NAME = "Sonar way";

  @Override
  public void define(Context context) {
    NewBuiltInQualityProfile profile = context.createBuiltInQualityProfile(
      PROFILE_NAME,
      CssLanguage.KEY
    );
    CssRules.getDefaultQualityProfileRuleKeys(PROFILE_NAME).forEach(key ->
      profile.activateRule(REPOSITORY_KEY, key)
    );
    profile.done();
  }
}
