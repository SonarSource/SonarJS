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

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.sonar.api.server.profile.BuiltInQualityProfilesDefinition;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.CheckList;
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

  static final List<String> RULES_PROVIDED_BY_SONARTS = Arrays.asList(
    "S101",
    "S117",
    "S105",
    "S1439",
    "S881",
    "S1110",
    "S1451",
    "S1821",
    "S2757",
    "S2870",
    "S3616",
    "S3972",
    "S3984",
    "S4622",
    "S4624",
    "S4782",

    "S125",
    "S1533",
    "S1541",
    "S1121",
    "S2068",
    "S2123",
    "S2201",
    "S2234",
    "S2681",
    "S2871",
    "S3981",
    "S4043",
    "S4123",
    "S4322",
    "S4275",
    "S4323",
    "S4324",
    "S4328",
    "S4335",
    "S4524",
    "S4619",
    "S4621",
    "S4623",
    "S4634",
    "S4798",
    "S4822",
    "S1874",
    "S2589",

    "S1226",
    "S1751",
    "S1854",
    "S3516",
    "S3626",
    "S4030",
    "S4157",
    "S4158",
    "S3801"
  );

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
    typeScriptRuleKeys.addAll(RULES_PROVIDED_BY_SONARTS);
    createProfile(SONAR_WAY, TypeScriptLanguage.KEY, typeScriptRuleKeys, context);
    createProfile(SONAR_WAY_RECOMMENDED_TS, TypeScriptLanguage.KEY, typeScriptRuleKeys, context);
  }

  private void createProfile(String profileName, String language, Set<String> keys, Context context) {
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

  private static Set<String> ruleKeys(List<Class> checks) {
    return checks.stream()
      .map(c -> ((Rule) c.getAnnotation(Rule.class)).key())
      .collect(Collectors.toSet());
  }
}
