/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.api.JsAnalysisConsumer;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide
public class AnalysisConsumers implements JsAnalysisConsumer {

  private static final Logger LOG = LoggerFactory.getLogger(AnalysisConsumers.class);

  private final List<JsAnalysisConsumer> consumers;

  public AnalysisConsumers() {
    consumers = List.of();
    LOG.debug("No registered JsAnalysisConsumer.");
  }

  public AnalysisConsumers(List<JsAnalysisConsumer> consumers) {
    this.consumers = List.copyOf(consumers);
    LOG.debug("Registered JsAnalysisConsumers {}", this.consumers);
  }

  @Override
  public void accept(JsFile jsFile) {
    consumers.forEach(c -> c.accept(jsFile));
  }

  @Override
  public void doneAnalysis() {
    consumers.forEach(JsAnalysisConsumer::doneAnalysis);
  }

  public boolean hasConsumers() {
    return !consumers.isEmpty();
  }

  public List<JsAnalysisConsumer> getConsumers() {
    return consumers;
  }
}
