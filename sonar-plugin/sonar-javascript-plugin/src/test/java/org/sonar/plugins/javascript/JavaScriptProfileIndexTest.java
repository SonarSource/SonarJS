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
package org.sonar.plugins.javascript;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.JavaScriptProfilesDefinition.PROFILES_JSON;

import com.google.gson.JsonParser;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class JavaScriptProfileIndexTest {

  @Test
  void should_index_profiles_by_language() {
    var profilesIndex = getClass().getClassLoader().getResourceAsStream(PROFILES_JSON);
    assertThat(profilesIndex).isNotNull();

    Set<String> indexedProfiles = new HashSet<>();
    JsonParser.parseReader(new InputStreamReader(profilesIndex, StandardCharsets.UTF_8))
      .getAsJsonArray()
      .forEach(profile -> {
        var profileJson = profile.getAsJsonObject();
        indexedProfiles.add(
          profileJson.get("language").getAsString() +
            ":" +
            profileJson.get("fileName").getAsString()
        );
      });

    assertThat(indexedProfiles).contains(
      "js:Sonar_way_js_profile.json",
      "ts:Sonar_way_ts_profile.json"
    );
  }
}
