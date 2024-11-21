/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package com.sonar.javascript.it.plugin.assertj;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasureAsDouble;

import com.sonar.orchestrator.Orchestrator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public class Measures {

  private final Orchestrator orchestrator;
  private final String componentKey;
  private final String branch;
  private final String pullRequest;

  public Measures(
    Orchestrator orchestrator,
    String componentKey,
    String branch,
    String pullRequest
  ) {
    this.orchestrator = orchestrator;
    this.componentKey = componentKey;
    this.branch = branch;
    this.pullRequest = pullRequest;
  }

  Map<String, Double> load(List<String> metricKeys) {
    return metricKeys
      .stream()
      .map(this::getMeasure)
      .filter(entry -> entry.getValue().isPresent())
      .map(entry -> Map.entry(entry.getKey(), entry.getValue().get()))
      .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  private Map.Entry<String, Optional<Double>> getMeasure(String metricKey) {
    var measure = getMeasureAsDouble(orchestrator, componentKey, metricKey, branch, pullRequest);
    return Map.entry(metricKey, Optional.ofNullable(measure));
  }
}
