/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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
