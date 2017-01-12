/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2017 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import com.google.common.collect.ImmutableMap;
import com.sonar.orchestrator.Orchestrator;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.SonarClient;
import org.sonar.wsclient.jsonsimple.JSONValue;

import static org.assertj.core.api.Assertions.assertThat;

public class DefaultProfileTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @Test
  public void duplicatedBlocks_should_be_activated_by_default() {
    orchestrator.resetData();
    SonarClient client = orchestrator.getServer().wsClient();

    Map<String, String> jsProfileNameById = jsProfileNamesById(client);

    String response = client.get("api/rules/search", ImmutableMap.<String, Object>of(
      "language", "js",
      "repositories", "common-js",
      "f", "actives"));

    Map jsonRoot = (Map) JSONValue.parse(response);
    Map actives = (Map) jsonRoot.get("actives");
    assertThat(ruleActivations(actives, jsProfileNameById, "common-js:InsufficientCommentDensity")).isEmpty();
    assertThat(ruleActivations(actives, jsProfileNameById, "common-js:DuplicatedBlocks")).contains("Sonar way");
  }

  private static Map<String, String> jsProfileNamesById(SonarClient client) {
    Map<String, String> namesById = new HashMap<>();
    String response = client.get("api/qualityprofiles/search", ImmutableMap.of("language", "js"));
    Map jsonRoot = (Map) JSONValue.parse(response);
    List<Map<String, String>> profiles = (List) jsonRoot.get("profiles");
    for (Map<String, String> profile : profiles) {
      namesById.put(profile.get("key"), profile.get("name"));
    }
    return namesById;
  }

  private static List<String> ruleActivations(Map actives, Map<String, String> jsProfileNameById, String ruleKey) {
    List<String> profileNames = new ArrayList<>();
    List<Map> activations = (List) actives.get(ruleKey);
    for (Map activation : activations) {
      String profileId = (String) activation.get("qProfile");
      profileNames.add(jsProfileNameById.get(profileId));
    }
    return profileNames;
  }

}
