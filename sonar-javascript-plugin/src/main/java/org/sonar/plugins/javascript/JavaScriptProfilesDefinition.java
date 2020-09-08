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
package org.sonar.plugins.javascript;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonarsource.analyzer.commons.BuiltInQualityProfileJsonLoader;

public class JavaScriptProfilesDefinition implements BuiltInQualityProfilesDefinition {

  static final String SONAR_WAY = "Sonar way";
  // unfortunately we have this inconsistency in names
  // in order to keep compatibility we should stick to these names
  static final String SONAR_WAY_RECOMMENDED_JS = "Sonar way Recommended";
  static final String SONAR_WAY_RECOMMENDED_TS = "Sonar way recommended";

  public static final String RESOURCE_PATH = "org/sonar/l10n/javascript/rules/javascript";
  public static final String SONAR_WAY_JSON = RESOURCE_PATH + "/Sonar_way_profile.json";
  public static final String SONAR_WAY_RECOMMENDED_JSON = RESOURCE_PATH + "/Sonar_way_recommended_profile.json";

  private static final Map<String, String> PROFILES = new HashMap<>();
  static {
    PROFILES.put(SONAR_WAY, SONAR_WAY_JSON);
    PROFILES.put(SONAR_WAY_RECOMMENDED_JS, SONAR_WAY_RECOMMENDED_JSON);
    PROFILES.put(SONAR_WAY_RECOMMENDED_TS, SONAR_WAY_RECOMMENDED_JSON);
  }

  private static final Map<String, String> REPO_BY_LANGUAGE = new HashMap<>();
  static {
    REPO_BY_LANGUAGE.put(JavaScriptLanguage.KEY, CheckList.JS_REPOSITORY_KEY);
    REPO_BY_LANGUAGE.put(TypeScriptLanguage.KEY, CheckList.TS_REPOSITORY_KEY);
  }

  @Override
  public void define(Context context) {
    Set<String> javaScriptRuleKeys = ruleKeys(CheckList.getJavaScriptChecks());
    createProfile(SONAR_WAY, JavaScriptLanguage.KEY, javaScriptRuleKeys, context);
    createProfile(SONAR_WAY_RECOMMENDED_JS, JavaScriptLanguage.KEY, javaScriptRuleKeys, context);

    Set<String> typeScriptRuleKeys = ruleKeys(CheckList.getTypeScriptChecks());
    createProfile(SONAR_WAY, TypeScriptLanguage.KEY, typeScriptRuleKeys, context);
    createProfile(SONAR_WAY_RECOMMENDED_TS, TypeScriptLanguage.KEY, typeScriptRuleKeys, context);
  }

  private static void createProfile(String profileName, String language, Set<String> keys, Context context) {
    NewBuiltInQualityProfile newProfile = context.createBuiltInQualityProfile(profileName, language);
    String jsonProfilePath = PROFILES.get(profileName);
    String repositoryKey = REPO_BY_LANGUAGE.get(language);
    Set<String> activeKeysForBothLanguages = BuiltInQualityProfileJsonLoader.loadActiveKeysFromJsonProfile(jsonProfilePath);

    keys.stream()
      .filter(activeKeysForBothLanguages::contains)
      .forEach(key -> newProfile.activateRule(repositoryKey, key));

    if (profileName.equals(SONAR_WAY_RECOMMENDED_JS) || profileName.equals(SONAR_WAY_RECOMMENDED_TS)) {
      newProfile.activateRule("common-" + language, "DuplicatedBlocks");
    }

    newProfile.done();
  }

  private static Set<String> ruleKeys(List<Class<? extends JavaScriptCheck>> checks) {
    return checks.stream()
      .map(c -> c.getAnnotation(Rule.class).key())
      .collect(Collectors.toSet());
  }
}
