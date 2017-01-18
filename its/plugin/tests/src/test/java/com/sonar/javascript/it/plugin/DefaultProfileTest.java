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

import com.sonar.orchestrator.Orchestrator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.QualityProfiles.SearchWsResponse.QualityProfile;
import org.sonarqube.ws.Rules;
import org.sonarqube.ws.client.rule.SearchWsRequest;

import static com.sonar.javascript.it.plugin.Tests.newWsClient;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

public class DefaultProfileTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @Test
  public void duplicatedBlocks_should_be_activated_by_default() {
    orchestrator.resetData();

    Map<String, Rules.ActiveList> actives = newWsClient().rules().search(new SearchWsRequest()
      .setLanguages(singletonList("js"))
      .setRepositories(singletonList("common-js"))
      .setFields(singletonList("actives"))).getActives().getActives();

    Map<String, String> jsProfileNameById = jsProfileNamesById();
    assertThat(ruleActivations(actives, jsProfileNameById, "common-js:InsufficientCommentDensity")).isEmpty();
    assertThat(ruleActivations(actives, jsProfileNameById, "common-js:DuplicatedBlocks")).containsExactly("Sonar way");
  }

  private static Map<String, String> jsProfileNamesById() {
    return newWsClient().qualityProfiles()
      .search(new org.sonarqube.ws.client.qualityprofile.SearchWsRequest().setLanguage("js")).getProfilesList()
      .stream()
      .collect(Collectors.toMap(QualityProfile::getKey, QualityProfile::getName));
  }

  private static List<String> ruleActivations(Map<String, Rules.ActiveList> actives, Map<String, String> jsProfileNameById, String ruleKey) {
    return actives.get(ruleKey).getActiveListList().stream()
      .map(active -> jsProfileNameById.get(active.getQProfile()))
      .collect(Collectors.toList());
  }
}
