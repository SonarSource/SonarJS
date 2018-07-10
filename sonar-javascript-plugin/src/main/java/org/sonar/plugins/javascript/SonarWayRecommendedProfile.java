/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import org.sonar.api.profiles.ProfileDefinition;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.rules.Rule;
import org.sonar.api.rules.RuleFinder;
import org.sonar.api.utils.ValidationMessages;
import org.sonar.javascript.checks.CheckList;

/**
 * Profile "Sonar way Recommended" contains all rules from {@link SonarWayProfile} "Sonar way" (bugs and pitfall detection),
 * plus more rules which are supposed to maintain code quality.
 */
public class SonarWayRecommendedProfile extends ProfileDefinition {

  // RuleFinder is only deprecated on scanner side, we can continue to use it on server side.
  private final RuleFinder ruleFinder;
  public static final String PROFILE_NAME = "Sonar way Recommended";
  public static final String PATH_TO_JSON = "org/sonar/l10n/javascript/rules/javascript/Sonar_way_recommended_profile.json";

  public SonarWayRecommendedProfile(RuleFinder ruleFinder) {
    this.ruleFinder = ruleFinder;
  }

  @Override
  public RulesProfile createProfile(ValidationMessages messages) {
    RulesProfile profile = RulesProfile.create(PROFILE_NAME, JavaScriptLanguage.KEY);

    loadFromCommonRepository(profile);
    loadActiveKeysFromJsonProfile(profile);

    return profile;
  }

  private void loadFromCommonRepository(RulesProfile profile) {
    Rule duplicatedBlocksRule = ruleFinder.findByKey("common-" + JavaScriptLanguage.KEY, "DuplicatedBlocks");
    // in SonarLint duplicatedBlocksRule == null
    if (duplicatedBlocksRule != null) {
      profile.activateRule(duplicatedBlocksRule, null);
    }
  }

  private void loadActiveKeysFromJsonProfile(RulesProfile rulesProfile) {
    for (String ruleKey : JsonProfileReader.ruleKeys(PATH_TO_JSON)) {
      Rule rule = ruleFinder.findByKey(CheckList.REPOSITORY_KEY, ruleKey);
      rulesProfile.activateRule(rule, null);
    }
  }

}
